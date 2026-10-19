import {
  commit,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { JSONSchemaType } from 'ajv';
import { emit } from '../../../../lib/event/emitter.js';
import {
  getConnection,
  pool
} from '../../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../../lib/util/hookable.js';
import {
  createUnusablePasswordHash,
  hashPassword,
  isBcryptHash,
  verifyPassword
} from '../../../../lib/util/passwordHelper.js';
import {
  getValue,
  getValueSync
} from '../../../../lib/util/registry.js';
import { CustomerRow } from '../../../../types/db/index.js';
import { getAjv } from '../../../base/services/getAjv.js';
import customerDataSchema from './customerDataSchema.json' with { type: 'json' };

export interface CustomerData {
  email?: string,
  full_name?: string,
  password?: string,
  group_id?: number,
  status?: number,
};

/**
 * Options only code can set. They are in the context, not in the data, because a
 * route passes the request body as the data (`POST /api/customers` does): a
 * caller of the API must not be able to pick its own hash, which would skip the
 * password rules, or to switch off the welcome email.
 */
export interface CreateCustomerContext {
  /**
   * A bcrypt hash, stored as given instead of hashing `data.password` (an
   * account moved from another store keeps its password). It is checked for the
   * shape of a bcrypt hash, skips `verifyPassword`, and cannot be combined with
   * `data.password`.
   */
  passwordHash?: string;
  /**
   * Create the account with no password at all: a hash of a random secret that
   * nobody knows is stored, and the customer chooses a password with "Forgot
   * your password?". Used when neither `data.password` nor `passwordHash` is
   * given; without this flag a missing password is an error, as before.
   */
  allowNoPassword?: boolean;
  /**
   * With `allowNoPassword`: the hash to store, so that a caller that creates
   * many accounts makes it once (a bcrypt hash costs about 60 ms).
   */
  unusablePasswordHash?: string;
  /**
   * Do not emit `customer_registered` (which sends the welcome email) or
   * `account_created`. For a bulk import: a store must not mail every customer
   * it loads.
   */
  suppressRegistrationEvent?: boolean;
  [key: string]: unknown;
}

type PasswordMode = 'password' | 'hash' | 'none';

/**
 * Decides where the stored password comes from, before anything is validated,
 * and refuses a combination that has no meaning.
 */
function passwordModeOf(
  data: CustomerData,
  context: CreateCustomerContext
): PasswordMode {
  const hasPassword = data.password !== undefined && data.password !== null;
  if (context.passwordHash !== undefined) {
    if (!isBcryptHash(context.passwordHash)) {
      throw new Error('The password hash is not a bcrypt hash');
    }
    if (hasPassword) {
      throw new Error('Give either a password or a password hash, not both');
    }
    return 'hash';
  }
  if (!hasPassword && context.allowNoPassword === true) {
    if (
      context.unusablePasswordHash !== undefined &&
      !isBcryptHash(context.unusablePasswordHash)
    ) {
      throw new Error('The password hash is not a bcrypt hash');
    }
    return 'none';
  }
  return 'password';
}

function validateCustomerDataBeforeInsert<T extends CustomerData>(
  data: T,
  mode: PasswordMode
): T {
  const ajv = getAjv();
  (customerDataSchema as JSONSchemaType<any>).required =
    mode === 'password'
      ? ['email', 'password', 'full_name']
      : ['email', 'full_name'];
  const jsonSchema = getValueSync(
    'createCustomerDataJsonSchema',
    customerDataSchema,
    {}
  );
  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (valid) {
    // Validate password
    if (mode === 'password') {
      const { password } = data;
      verifyPassword(password || '');
    }
    return data;
  } else {
    throw new Error(validate.errors[0].message);
  }
}

async function insertCustomerData<T extends CustomerData>(data: T, connection: PoolClient) {
  const customer = await insert('customer').given(data).execute(connection) as CustomerRow;
  return customer;
}

/**
 * Create customer service. This service will create a customer with all related data
 * @param {Object} data
 * @param {Object} context
 */
async function createCustomer<T extends CustomerData>(data: T, context: Record<string, unknown> = {}): Promise<CustomerRow> {
  const options = context as CreateCustomerContext;
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const customerData = await getValue(
      'customerDataBeforeCreate',
      data,
      context
    );
    const passwordMode = passwordModeOf(customerData, options);
    // Validate customer data
    validateCustomerDataBeforeInsert(customerData, passwordMode);
    const { email, password } = customerData;
    // The stored password: hashed here, taken as given, or one nobody knows
    let hashedPassword: string;
    if (passwordMode === 'hash') {
      hashedPassword = options.passwordHash as string;
    } else if (passwordMode === 'none') {
      hashedPassword =
        options.unusablePasswordHash ?? createUnusablePasswordHash();
    } else {
      hashedPassword = hashPassword(password || '');
    }
    // Check if email is already used
    const existingCustomer = await select()
      .from('customer')
      .where('email', '=', email)
      .load(pool);

    if (existingCustomer) {
      throw new Error('Email is already used');
    }

    customerData.status =
      customerData.status !== undefined ? customerData.status : 1;
    customerData.password = hashedPassword;
    // Never a column: a body could carry it, and only the context may say it
    delete (customerData as Record<string, unknown>).password_hash;
    customerData.group_id =
      customerData.group_id !== undefined ? customerData.group_id : 1;
    // Insert customer data
    const customer = await hookable(insertCustomerData, {
      ...context,
      connection
    })(customerData, connection);

    // If status = 1, Emit event customer_registered
    // In case of status = 0, the custom extension will need to emit the event
    // (neither is emitted for a bulk import: suppressRegistrationEvent)
    if (options.suppressRegistrationEvent !== true) {
      if (parseInt(customer.status.toString(), 10) === 1) {
        await emit('customer_registered', customer);
      } else {
        await emit('account_created', customer);
      }
    }

    await commit(connection);
    return customer;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create customer service. This service will create a customer with all related data
 * @param {Object} data
 * @param {Object} context
 */
export default async <T extends CustomerData>(data: T, context: Record<string, unknown> = {}): Promise<CustomerRow> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const customer = await hookable(createCustomer, context)(data, context);
  return customer;
};

export function hookBeforeInsertCustomerData(
  callback: (
    this: Record<string, unknown>,
    ...args: [
    data: CustomerData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertCustomerData', callback, priority);
}

export function hookAfterInsertCustomerData(
  callback: (
    this: Record<string, unknown>,
    ...args: [
    data: CustomerData,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertCustomerData', callback, priority);
}

export function hookBeforeCreateCustomer(
  callback: (
    this: Record<string, unknown>,
    ...args: [
    data: CustomerData,
    context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createCustomer', callback, priority);
}

export function hookAfterCreateCustomer(
  callback: (
    this: Record<string, unknown>,
    ...args: [
    data: CustomerData,
    context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createCustomer', callback, priority);
}
