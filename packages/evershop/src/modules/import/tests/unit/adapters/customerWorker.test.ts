import bcrypt from 'bcryptjs';
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { PgJobAdmin } from '../../../adapters/PgJobAdmin.js';
import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import { ImportService } from '../../../services/jobs/ImportService.js';
import { csvLine } from '../../../services/report/csvWrite.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { composeWorker } from '../../../worker/compose.js';
import type { CorePorts } from '../../../worker/compose.js';
import { runWorker } from '../../../worker/runWorker.js';
import { KNOWN_HASH } from '../helpers/customerServicesContract.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * A customers file through a worker on the real services, on the second scratch
 * database (a copy of the core schema with no store running on it): the check,
 * the writer, and core's createCustomer with the options of G3, updateCustomer
 * and setCustomerMetafields. Each test removes what it made.
 */
jest.setTimeout(120_000);

process.env.SUPPRESS_NO_CONFIG_WARNING = '1';
process.env.SUPPRESS_STRICTNESS_CHECK = '1';
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

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

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;

let eventBaseline = 0;

async function cleanUp() {
  await q(`DELETE FROM customer WHERE email ILIKE 'wk-%@example.com'`);
  await q(`DELETE FROM metafield_definition WHERE owner_type = 'customer'`);
  await q(
    `DO $$ BEGIN
       ALTER TABLE customer_group DISABLE TRIGGER USER;
       DELETE FROM customer_group WHERE group_name LIKE 'Worker %';
       ALTER TABLE customer_group ENABLE TRIGGER USER;
     END $$`
  );
  await q('DELETE FROM event WHERE event_id > $1', [eventBaseline]);
}

async function seed() {
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  await cleanUp();
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  await q(
    `INSERT INTO customer_group (customer_group_id, group_name)
     OVERRIDING SYSTEM VALUE VALUES (1, 'Worker default')
     ON CONFLICT (customer_group_id) DO UPDATE SET group_name = 'Worker default'`
  );
  await q(
    `SELECT setval(pg_get_serial_sequence('customer_group', 'customer_group_id'),
                   (SELECT max(customer_group_id) FROM customer_group))`
  );
  await q(
    `INSERT INTO customer_group (group_name) VALUES ('Worker wholesale')`
  );
  const definitions: Array<[string, string, boolean, unknown[]]> = [
    ['birthday', 'date', false, []],
    ['optin', 'boolean', true, []]
  ];
  for (const [key, type, required, validations] of definitions) {
    // eslint-disable-next-line no-await-in-loop
    await q(
      `INSERT INTO metafield_definition
         (owner_type, namespace, field_key, name, field_type, required, validations)
       VALUES ('customer', 'custom', $1, $1, $2, $3, $4::jsonb)`,
      [key, type, required, JSON.stringify(validations)]
    );
  }
}

const HEADER = [
  'email',
  'full_name',
  'status',
  'group',
  'password_hash',
  'password',
  'metafield:custom.birthday',
  'metafield:custom.optin'
];

const fileOf = (...rows: string[][]) =>
  `${csvLine(HEADER)}${rows.map((row) => csvLine(row)).join('')}`;

describeDb('a customers file through a worker on the real services', () => {
  const logger = new CollectingLogger();

  const setup = async () => {
    await seed();
    const ports: CorePorts = {
      pool: db!.pool,
      services: createCoreEntityServices!(db!.pool),
      routePaths: () => ['/cart'],
      enabledLanguages: async () => ['en'],
      async storeImage(file) {
        return { url: `/assets/${file.directory}/${file.fileName}` };
      },
      ownStorage: () => [],
      allowedImageTypes: () => ['image/png'],
      maxImageBytesForType: () => 1_000_000,
      sanitizeFileName: (name) => name,
      logger,
      limits: { maxRows: 1000, maxCellLength: 65_536, maxIssues: 1000 },
      // No event process runs on this database: the worker never waits for the queue.
      backlog: {
        eventBacklogHigh: 1_000_000,
        eventBacklogLow: 999_999,
        eventBacklogMaxWaitMs: 30 * 60_000
      },
      imageTimeoutMs: 5000,
      imageConcurrency: 4,
      allowPrivateNetworks: () => true,
      retentionMs: 86_400_000
    };
    const composed = composeWorker(ports);
    const service = new ImportService({
      jobs: composed.admin,
      sha256: nodeSha256,
      maxFileBytes: 10_000_000
    });
    await db!.pool.query('TRUNCATE import_job RESTART IDENTITY CASCADE');
    const worker = (uuid: string) =>
      runWorker(uuid, {
        deps: composed.deps,
        admin: composed.admin,
        workerId: 'test:1'
      });
    const run = async (text: string) => {
      const { job } = await service.upload({
        entity: 'customer',
        fileName: 'customers.csv',
        createdBy: null,
        file: (async function* once() {
          yield Buffer.from(text);
        })()
      });
      const checked = await worker(job.uuid);
      const state = await composed.admin.get(job.id);
      if (checked.outcome !== 'validated' || state!.counts.errors > 0) {
        return { job, checked, done: null, state };
      }
      await service.start(job.id);
      const done = await worker(job.uuid);
      return { job, checked, done, state: await composed.admin.get(job.id) };
    };
    return {
      composed,
      run,
      async close() {
        try {
          await composed.close();
        } finally {
          await cleanUp();
        }
      }
    };
  };

  const customers = () =>
    q(
      `SELECT c.email, c.full_name, c.status, g.group_name, c.password, c.meta_data
         FROM customer c LEFT JOIN customer_group g ON g.customer_group_id = c.group_id
        WHERE c.email ILIKE 'wk-%@example.com' ORDER BY c.email`
    );

  it('checks, imports, and imports again as updates: passwords, groups, custom fields, no welcome e-mail', async () => {
    const t = await setup();
    try {
      const first = fileOf(
        [
          'wk-ann@example.com',
          'Ann',
          '1',
          'Worker wholesale',
          '',
          'Secret-1',
          '1990-04-12',
          '1'
        ],
        ['wk-bob@example.com', 'Bob', '1', '', KNOWN_HASH, '', '', '0'],
        ['WK-CY@example.com', 'Cy', '0', '', '', '', '', '1'],
        ['wk-di@example.com', 'Di', '', '', '', '', '', '1']
      );
      const { job, checked, done, state } = await t.run(first);
      expect(checked).toEqual({ outcome: 'validated', exitCode: 0 });
      expect(done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(state).toMatchObject({
        status: 'completed',
        counts: { created: 4, updated: 0, failed: 0, total: 4, lastUnit: 4 }
      });
      expect(job.id).toBeGreaterThan(0);

      let found = await customers();
      expect(
        found.map((c) => [c.email, c.full_name, c.status, c.group_name])
      ).toEqual([
        ['WK-CY@example.com', 'Cy', 0, 'Worker default'],
        ['wk-ann@example.com', 'Ann', 1, 'Worker wholesale'],
        ['wk-bob@example.com', 'Bob', 1, 'Worker default'],
        ['wk-di@example.com', 'Di', 1, 'Worker default']
      ]);
      const byEmail = Object.fromEntries(found.map((c) => [c.email, c]));
      // The plain password logs in; the hash is stored as it is; the others
      // get one password that nobody knows, hashed once for the whole job.
      expect(
        bcrypt.compareSync('Secret-1', byEmail['wk-ann@example.com'].password)
      ).toBe(true);
      expect(byEmail['wk-bob@example.com'].password).toBe(KNOWN_HASH);
      const nobody = byEmail['WK-CY@example.com'].password;
      expect(nobody).toMatch(/^\$2[aby]\$/);
      expect(byEmail['wk-di@example.com'].password).toBe(nobody);
      expect(bcrypt.compareSync('', nobody)).toBe(false);
      // The custom fields, saved after the customer.
      expect(byEmail['wk-ann@example.com'].meta_data).toEqual({
        custom: { birthday: '1990-04-12', optin: true }
      });
      expect(byEmail['wk-bob@example.com'].meta_data).toEqual({
        custom: { optin: false }
      });
      // No welcome e-mail: neither event was written (the trigger's own is).
      expect(
        (
          await q(
            `SELECT count(*)::int AS n FROM event
              WHERE event_id > $1 AND name IN ('customer_registered','account_created')`,
            [eventBaseline]
          )
        )[0].n
      ).toBe(0);
      expect(
        (
          await q(
            `SELECT count(*)::int AS n FROM event
              WHERE event_id > $1 AND name = 'customer_created'`,
            [eventBaseline]
          )
        )[0].n
      ).toBe(4);

      // The same file again with new names and passwords: updates, no copies, the
      // e-mail in another letter case is the same customer, a password is never
      // changed, and a custom field the file does not mention is kept.
      const second = fileOf(
        ['WK-ANN@example.com', 'Ann Q.', '', '', '', 'Changed-9', '', ''],
        ['wk-bob@example.com', 'Bobby', '', '', '', '', '1999-01-01', '1']
      );
      const again = await t.run(second);
      expect(again.done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(again.state).toMatchObject({
        counts: { created: 0, updated: 2, failed: 0 }
      });
      found = await customers();
      expect(found).toHaveLength(4);
      const next = Object.fromEntries(found.map((c) => [c.email, c]));
      expect(next['wk-ann@example.com'].full_name).toBe('Ann Q.');
      expect(
        bcrypt.compareSync('Secret-1', next['wk-ann@example.com'].password)
      ).toBe(true);
      expect(
        bcrypt.compareSync('Changed-9', next['wk-ann@example.com'].password)
      ).toBe(false);
      expect(next['wk-ann@example.com'].meta_data).toEqual({
        custom: { birthday: '1990-04-12', optin: true }
      });
      expect(next['wk-bob@example.com'].meta_data).toEqual({
        custom: { birthday: '1999-01-01', optin: true }
      });
    } finally {
      await t.close();
    }
  });

  it('stops at the check with problems the store would find, and writes nothing', async () => {
    const t = await setup();
    try {
      const { checked, done, state } = await t.run(
        fileOf(
          ['wk-ann@example.com', 'Ann', '1', 'VIP', '', 'abc', '', '1'],
          ['wk-bob@example.com', 'Bob', '1', '', '', '', 'not-a-date', '']
        )
      );
      expect(checked.outcome).toBe('validated');
      expect(done).toBeNull();
      expect(state).toMatchObject({ status: 'validated' });
      expect(state!.counts.errors).toBeGreaterThanOrEqual(4);
      expect(await customers()).toEqual([]);
    } finally {
      await t.close();
    }
  });
});
