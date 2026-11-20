import type { PoolClient } from '@evershop/postgres-query-builder';
import { warning } from '../../../lib/log/logger.js';
import { getValue } from '../../../lib/util/registry.js';
import type {
  InsertResultWithRow,
  OrderAddressRow,
  OrderRow
} from '../../../types/db/index.js';
import type { Cart } from '../../checkout/services/cart/Cart.js';

/**
 * What `this` holds in an `orderNumber` processor.
 */
export interface OrderNumberContext {
  /**
   * The new order as it is about to be saved: the columns the insert sets,
   * with the `order_id` it gets and its `created_at`. Columns left to their
   * database default are missing. `order_number` holds the default number;
   * the number so far is the processor's argument.
   */
  order: Partial<OrderRow> &
    Pick<OrderRow, 'order_id' | 'order_number' | 'created_at'>;
  /** The order's shipping address, already saved, or `null` */
  shippingAddress: OrderAddressRow | null;
  /** The order's billing address, already saved, or `null` */
  billingAddress: OrderAddressRow | null;
  /** `checkout` for an order a shopper places, `import` for an imported order */
  source: 'checkout' | 'import';
  /** The cart being checked out (`getItems()`, `getData()`); `null` for an import */
  cart: Cart | null;
  /**
   * The open transaction that saves the order. Query with it, for example to
   * keep a counter of your own that rolls back with a failed checkout. Never
   * commit, roll back or release it.
   */
  connection: PoolClient;
}

export interface InsertOrderOptions {
  source: OrderNumberContext['source'];
  shippingAddress: OrderAddressRow | null;
  billingAddress: OrderAddressRow | null;
  cart: Cart | null;
  /** A number to keep as it is, such as an imported order's own: no processor runs */
  orderNumber?: string;
}

/** The longest order number accepted from the `orderNumber` processors */
export const MAX_ORDER_NUMBER_LENGTH = 64;

/**
 * The number of an order that no processor changes: 10000 plus its id. It is
 * unique because Postgres never gives out an order id twice, and it is higher
 * than any number the earlier rule gave (10000, plus the highest order id at
 * that time, plus 1), which was never more than 10000 plus the order's own id.
 */
export function defaultOrderNumber(orderId: number): string {
  return String(10000 + orderId);
}

const SAVEPOINT = 'evershop_order_number';

class RejectedOrderNumber extends Error {}

function checkOrderNumber(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RejectedOrderNumber('is not a string');
  }
  const number = value.trim();
  if (number === '') {
    throw new RejectedOrderNumber('is empty');
  }
  if (number.length > MAX_ORDER_NUMBER_LENGTH) {
    throw new RejectedOrderNumber(
      `is longer than ${MAX_ORDER_NUMBER_LENGTH} characters`
    );
  }
  if (/[\u0000-\u001f\u007f]/.test(number)) {
    throw new RejectedOrderNumber('has a control character');
  }
  return number;
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value.length > 80 ? `${value.slice(0, 80)}…` : value);
  }
  return value === undefined || value === null
    ? String(value)
    : `a ${typeof value}`;
}

/** Why the processors' number was not used, for the warning */
function explain(produced: unknown, e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (e instanceof RejectedOrderNumber) {
    return `the orderNumber processors returned ${describeValue(
      produced
    )}, which ${message}`;
  }
  if (
    (e as { constraint?: string } | null)?.constraint === 'ORDER_NUMBER_UNIQUE'
  ) {
    return `the orderNumber processors returned ${describeValue(
      produced
    )}, which is already the number of another order`;
  }
  if (produced === undefined) {
    return `an orderNumber processor failed (${message})`;
  }
  return `saving the number ${describeValue(produced)} failed (${message})`;
}

/**
 * The parameter for a column value, as the query builder's `given()` makes it
 * (arrays and objects as JSON), except that a Date stays a Date, which pg
 * sends as a timestamp
 */
function toParameter(value: unknown): unknown {
  if (
    Array.isArray(value) ||
    (typeof value === 'object' && value !== null && !(value instanceof Date))
  ) {
    return JSON.stringify(value);
  }
  return value;
}

async function orderColumns(connection: PoolClient): Promise<Set<string>> {
  const { rows } = await connection.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'order'`
  );
  return new Set(rows.map((row: { column_name: string }) => row.column_name));
}

// The query builder's insert() always leaves identity columns out, and the
// order id is taken before the insert, so this one insert is written by hand.
async function insertRow(
  connection: PoolClient,
  data: Record<string, unknown>
): Promise<InsertResultWithRow<OrderRow>> {
  const names = Object.keys(data);
  const { rows } = await connection.query(
    `INSERT INTO "order" (${names.map((name) => `"${name}"`).join(', ')})
     OVERRIDING SYSTEM VALUE
     VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    names.map((name) => toParameter(data[name]))
  );
  return { ...rows[0], insertId: rows[0].order_id };
}

/**
 * Insert a new order row, with its number, in the caller's transaction.
 *
 * The order id is taken from the id sequence first, so the number can be
 * built from it before the row exists: the row is inserted once, with its
 * final number, and the `order_created` event (written by a trigger on the
 * insert) carries that number. Two checkouts at the same time never get the
 * same number: they get different ids.
 *
 * The number starts as `defaultOrderNumber(order_id)`. Extensions change it
 * with an `orderNumber` processor, added in their bootstrap:
 *
 *   addProcessor('orderNumber', function (value) {
 *     const country = this.shippingAddress?.country;
 *     return country ? `${country}-${value}` : value; // US-10296
 *   });
 *
 * `this` is an `OrderNumberContext` (a `function`, not an arrow function,
 * sees it). Keep `value` or `this.order.order_id` in the result so it stays
 * unique, or keep a counter of your own with `this.connection`.
 *
 * The processors and the insert run inside a savepoint. When a processor
 * throws, its SQL fails, or the number is not a string, is empty, is longer
 * than `MAX_ORDER_NUMBER_LENGTH`, has a control character or is already
 * another order's, all of it is rolled back and the order is saved with the
 * default number, with a warning: a broken format never fails a checkout.
 *
 * `row` holds the order's columns; keys that are not columns of `order` are
 * left out, as `insert().given()` does. `options.orderNumber` keeps a number
 * as it is (no processor runs).
 *
 * @returns The inserted row, with `insertId`.
 */
export async function insertOrder(
  connection: PoolClient,
  row: Record<string, unknown>,
  options: InsertOrderOptions
): Promise<InsertResultWithRow<OrderRow>> {
  // A savepoint needs a transaction, and the order must not be saved alone
  if ((connection as { INTRANSACTION?: boolean }).INTRANSACTION !== true) {
    throw new Error(
      'insertOrder: the connection is not in a transaction. Start one with startTransaction.'
    );
  }
  const columns = await orderColumns(connection);
  const { rows } = await connection.query(
    `SELECT nextval(pg_get_serial_sequence('"order"', 'order_id'))::int AS id,
            now() AS now`
  );
  const orderId: number = rows[0].id;
  // `now()` is the column's default; a `created_at` in `row` wins over it
  const data: Record<string, unknown> = { created_at: rows[0].now };
  Object.keys(row).forEach((key) => {
    if (columns.has(key) && row[key] !== undefined) {
      data[key] = row[key];
    }
  });
  data.order_id = orderId;

  if (options.orderNumber !== undefined) {
    return insertRow(connection, {
      ...data,
      order_number: options.orderNumber
    });
  }

  const fallback = defaultOrderNumber(orderId);
  const context: OrderNumberContext = {
    order: {
      ...data,
      order_number: fallback
    } as OrderNumberContext['order'],
    shippingAddress: options.shippingAddress,
    billingAddress: options.billingAddress,
    source: options.source,
    cart: options.cart,
    connection
  };
  await connection.query(`SAVEPOINT ${SAVEPOINT}`);
  let produced: unknown;
  try {
    produced = await getValue('orderNumber', fallback, context);
    const order = await insertRow(connection, {
      ...data,
      order_number: checkOrderNumber(produced)
    });
    await connection.query(`RELEASE SAVEPOINT ${SAVEPOINT}`);
    return order;
  } catch (e) {
    await connection.query(`ROLLBACK TO SAVEPOINT ${SAVEPOINT}`);
    await connection.query(`RELEASE SAVEPOINT ${SAVEPOINT}`);
    // The default number itself could not be saved: not a processor's doing
    if (produced === fallback) {
      throw e;
    }
    const order = await insertRow(connection, {
      ...data,
      order_number: fallback
    });
    warning(
      `Order ${orderId} got the default number ${fallback}: ${explain(
        produced,
        e
      )}.`
    );
    return order;
  }
}
