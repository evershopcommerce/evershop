import bcrypt from 'bcryptjs';
import { afterAll, describe, jest } from '@jest/globals';
import { addProcessor } from '../../../../../lib/util/registry.js';
import { normalizeAddressInput } from '../../../../customer/services/customer/address/normalizeAddressInput.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { MemoryServices } from '../../../testing/MemoryServices.js';
import { customerServicesContract } from '../helpers/customerServicesContract.js';
import type { CustomerServicesHarness } from '../helpers/customerServicesContract.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * The services that write customers, held to one contract: `MemoryServices`
 * everywhere, and core's own services (createCustomer with the options of G3,
 * updateCustomer, setCustomerMetafields) on the second scratch database, which
 * is a schema-only copy of core with no store running on it. Each test removes
 * what it made.
 */
jest.setTimeout(60_000);

const DEFINITIONS = [
  { namespace: 'custom', key: 'optin', type: 'boolean' as const },
  {
    namespace: 'custom',
    key: 'years',
    type: 'integer' as const,
    validations: [{ type: 'range' as const, min: 0, max: 50 }]
  }
];

// ---- in memory ---------------------------------------------------------

function memoryHarness(): CustomerServicesHarness {
  const lookup = new MemoryLookup({
    customerGroups: [{ name: 'Contract first' }, { name: 'Contract second' }],
    metafieldDefinitions: { customer: DEFINITIONS }
  });
  const memory = new MemoryServices(lookup);
  const byEmail = (email: string) =>
    [...lookup.customers_.values()].find((c) => c.email === email) ?? null;
  return {
    services: memory,
    groups: { first: 1, second: 2 },
    async customer(email) {
      const found = byEmail(email);
      return found ? { ...found } : null;
    },
    async storedHash(email) {
      const found = byEmail(email);
      const password = found && memory.customerPasswords.get(found.uuid);
      return password && password.kind !== 'plain' ? password.value : null;
    },
    async loginWorks(email, password) {
      const found = byEmail(email);
      const stored = found && memory.customerPasswords.get(found.uuid);
      if (!stored) return false;
      if (stored.kind === 'plain') return stored.value === password;
      if (stored.kind === 'hash')
        return bcrypt.compareSync(password, stored.value);
      return false;
    },
    async addresses(email) {
      const found = byEmail(email);
      return lookup.addresses_
        .filter((a) => found && a.customerId === found.id)
        .map((a) => ({
          uuid: a.uuid,
          fields: { ...a.fields },
          extra: a.extra,
          isDefault: a.isDefault
        }));
    },
    async welcomeEvents() {
      return 0;
    },
    async count() {
      return lookup.customers_.size;
    }
  };
}

customerServicesContract('MemoryServices', async () => memoryHarness());

// ---- core's services, on the second scratch database -------------------

const db = await openScratchDb({ core: true });
if (db) pointCoreAt(db);
const describeDb = db ? describe : describe.skip;

const { createCoreEntityServices } = db
  ? await import('../../../adapters/CoreEntityServices.js')
  : { createCoreEntityServices: null };
const corePool = db
  ? (await import('../../../../../lib/postgres/connection.js')).pool
  : null;

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

let eventBaseline = 0;

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;

async function cleanUp() {
  await q(`DELETE FROM customer WHERE email LIKE 'contract-%@example.com'`);
  await q(`DELETE FROM metafield_definition WHERE owner_type = 'customer'`);
  // A trigger refuses to delete the default group, which is the first one.
  await q(
    `DO $$ BEGIN
       ALTER TABLE customer_group DISABLE TRIGGER USER;
       DELETE FROM customer_group WHERE group_name LIKE 'Contract %';
       ALTER TABLE customer_group ENABLE TRIGGER USER;
     END $$`
  );
  await q('DELETE FROM event WHERE event_id > $1', [eventBaseline]);
}

async function realHarness(): Promise<CustomerServicesHarness> {
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  await cleanUp();
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  // A customer without a group gets group 1 (a trigger), so group 1 must be there.
  await q(
    `INSERT INTO customer_group (customer_group_id, group_name)
     OVERRIDING SYSTEM VALUE VALUES (1, 'Contract first')
     ON CONFLICT (customer_group_id) DO UPDATE SET group_name = 'Contract first'`
  );
  // The group above was given its id, so the sequence has not moved past it.
  await q(
    `SELECT setval(pg_get_serial_sequence('customer_group', 'customer_group_id'),
                   (SELECT max(customer_group_id) FROM customer_group))`
  );
  const [{ customer_group_id: second }] = await q(
    `INSERT INTO customer_group (group_name) VALUES ('Contract second')
     RETURNING customer_group_id`
  );
  for (const definition of DEFINITIONS) {
    // eslint-disable-next-line no-await-in-loop
    await q(
      `INSERT INTO metafield_definition
         (owner_type, namespace, field_key, name, field_type, validations)
       VALUES ('customer', $1, $2, $2, $3, $4::jsonb)`,
      [
        definition.namespace,
        definition.key,
        definition.type,
        JSON.stringify(
          (definition as { validations?: unknown[] }).validations ?? []
        )
      ]
    );
  }
  const find = async (email: string) =>
    (
      await q(
        `SELECT customer_id, uuid, email, full_name, status, group_id, password, meta_data
           FROM customer WHERE email = $1`,
        [email]
      )
    )[0] ?? null;
  return {
    services: createCoreEntityServices!(db!.pool),
    groups: { first: 1, second },
    async customer(email) {
      const row = await find(email);
      return row
        ? {
            id: row.customer_id,
            uuid: row.uuid,
            email: row.email,
            name: row.full_name,
            status: row.status === 1 ? 1 : 0,
            groupId: row.group_id,
            metaData: row.meta_data
          }
        : null;
    },
    async storedHash(email) {
      return (await find(email))?.password ?? null;
    },
    async loginWorks(email, password) {
      const row = await find(email);
      return row ? bcrypt.compareSync(password, row.password) : false;
    },
    async addresses(email) {
      const rows = await q(
        `SELECT a.* FROM customer_address a JOIN customer c ON c.customer_id = a.customer_id
          WHERE c.email = $1 ORDER BY a.customer_address_id`,
        [email]
      );
      return rows.map((row) => ({
        uuid: row.uuid,
        fields: Object.fromEntries(
          [
            'recipient',
            'given_name',
            'family_name',
            'organization',
            'address_line_1',
            'address_line_2',
            'address_line_3',
            'dependent_locality',
            'locality',
            'administrative_area',
            'postal_code',
            'sorting_code',
            'country',
            'telephone'
          ].map((column) => [column, row[column] ?? ''])
        ),
        extra: row.extra ?? null,
        isDefault: Boolean(row.is_default)
      }));
    },
    async welcomeEvents() {
      return Number(
        (
          await q(
            `SELECT count(*) AS n FROM event
              WHERE event_id > $1 AND name IN ('customer_registered', 'account_created')`,
            [eventBaseline]
          )
        )[0].n
      );
    },
    async count() {
      return Number(
        (
          await q(
            `SELECT count(*) AS n FROM customer WHERE email LIKE 'contract-%@example.com'`
          )
        )[0].n
      );
    }
  };
}

// The customer module registers its normalizer on the seam when it boots.
addProcessor('customerAddressDataBeforeCreate', normalizeAddressInput, 0);

describeDb('the real customer services of core', () => {
  customerServicesContract('CoreEntityServices', realHarness);

  afterAll(async () => {
    await cleanUp();
  });
});
