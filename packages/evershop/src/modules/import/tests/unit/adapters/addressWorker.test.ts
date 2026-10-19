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
import { registerAddressField } from '../../../../../lib/address/extras.js';
import { addProcessor } from '../../../../../lib/util/registry.js';
import { normalizeAddressInput } from '../../../../customer/services/customer/address/normalizeAddressInput.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * Customers, then their addresses, through a worker on the real services, on the
 * second scratch database (a copy of the core schema with no store running on
 * it): core's createCustomer, and createCustomerAddress with its seam and its
 * validation. Each test removes what it made.
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
if (db) {
  // The customer module registers its normalizer on the seam when it boots.
  addProcessor('customerAddressDataBeforeCreate', normalizeAddressInput, 0);
  // An extension's extra field, which the file names in its `extra` column.
  registerAddressField({
    id: 'gift_note',
    type: 'text',
    label: 'Gift note',
    countries: ['US']
  });
}

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;

let eventBaseline = 0;

async function cleanUp() {
  await q(`DELETE FROM customer WHERE email ILIKE 'wa-%@example.com'`);
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
}

const CUSTOMERS = `email,full_name,password\n${['ann', 'bob', 'cy']
  .map((n) => `wa-${n}@example.com,${n},Secret-1`)
  .join('\n')}\n`;

const HEADER = [
  'email',
  'recipient',
  'given_name',
  'family_name',
  'organization',
  'address_line_1',
  'address_line_2',
  'locality',
  'administrative_area',
  'postal_code',
  'country',
  'telephone',
  'extra',
  'is_default'
];
const fileOf = (...rows: string[][]) =>
  `${csvLine(HEADER)}${rows.map((row) => csvLine(row)).join('')}`;

describeDb('customer addresses through a worker on the real services', () => {
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
      backlog: {
        eventBacklogHigh: 1_000_000,
        eventBacklogLow: 100,
        eventBacklogMaxWaitMs: 30 * 60_000
      },
      imageTimeoutMs: 5000,
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
    const run = async (
      entity: 'customer' | 'customerAddress',
      text: string
    ) => {
      const { job } = await service.upload({
        entity,
        fileName: `${entity}.csv`,
        createdBy: null,
        file: (async function* once() {
          yield Buffer.from(text);
        })()
      });
      const checked = await worker(job.uuid);
      const state = await composed.admin.get(job.id);
      if (checked.outcome !== 'validated' || state!.counts.errors > 0) {
        return {
          job,
          checked,
          done: null,
          state,
          issues: (
            await composed.admin.issuePage(job.id, {
              phase: 'validate',
              offset: 0,
              limit: 100
            })
          ).items
        };
      }
      await service.start(job.id);
      const done = await worker(job.uuid);
      return {
        job,
        checked,
        done,
        state: await composed.admin.get(job.id),
        issues: []
      };
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

  const addresses = () =>
    q(
      `SELECT c.email, a.recipient, a.given_name, a.family_name, a.organization,
              a.address_line_1, a.locality, a.administrative_area, a.postal_code,
              a.country, a.telephone, a.extra, a.is_default
         FROM customer_address a JOIN customer c ON c.customer_id = a.customer_id
        WHERE c.email ILIKE 'wa-%@example.com'
        ORDER BY a.customer_address_id`
    );

  it('adds the addresses of customers that an earlier job imported: several countries, defaults, no matching', async () => {
    const t = await setup();
    try {
      const customers = await t.run('customer', CUSTOMERS);
      expect(customers.done).toEqual({ outcome: 'completed', exitCode: 0 });

      const first = fileOf(
        [
          'wa-ann@example.com',
          'Ann A',
          '',
          '',
          '',
          '1 Market Street',
          'Suite 200',
          'San Francisco',
          'US-CA',
          '94105',
          'US',
          '415-555-0100',
          '',
          '1'
        ],
        [
          'WA-ANN@example.com',
          'Ann A',
          '',
          '',
          'Acme',
          '500 Howard Street',
          '',
          'San Francisco',
          'US-CA',
          '94105',
          'us',
          '+14155550100',
          '{"gift_note":"Door"}',
          '0'
        ],
        [
          'wa-bob@example.com',
          'Lukas Schmidt',
          '',
          '',
          '',
          'Unter den Linden 77',
          '',
          'Berlin',
          '',
          '10117',
          'DE',
          '+4930123456',
          '',
          '1'
        ],
        [
          'wa-cy@example.com',
          'Aiko',
          '',
          '',
          '',
          '1-1 Chiyoda',
          '',
          'Chiyoda-ku',
          'JP-13',
          '100-0001',
          'JP',
          '+81312345678',
          '',
          '1'
        ]
      );
      const { checked, done, state, issues } = await t.run(
        'customerAddress',
        first
      );
      expect(issues).toEqual([]);
      expect(checked).toEqual({ outcome: 'validated', exitCode: 0 });
      expect(done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(state).toMatchObject({
        counts: { created: 4, updated: 0, failed: 0, total: 4, lastUnit: 4 }
      });

      const found = await addresses();
      expect(
        found.map((a) => [
          a.email,
          a.address_line_1,
          a.country,
          a.telephone,
          a.is_default
        ])
      ).toEqual([
        ['wa-ann@example.com', '1 Market Street', 'US', '+14155550100', true],
        [
          'wa-ann@example.com',
          '500 Howard Street',
          'US',
          '+14155550100',
          false
        ],
        [
          'wa-bob@example.com',
          'Unter den Linden 77',
          'DE',
          '+4930123456',
          true
        ],
        ['wa-cy@example.com', '1-1 Chiyoda', 'JP', '+81312345678', true]
      ]);
      // A 0 never takes the flag from another address, so Ann's first stays the default.
      expect(found[1].extra).toEqual({ gift_note: 'Door' });
      expect(found[1].organization).toBe('Acme');
      expect(found[0].administrative_area).toBe('US-CA');

      // The same file again: every address is added again, nothing is matched.
      const again = await t.run('customerAddress', first);
      expect(again.done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(again.state).toMatchObject({ counts: { created: 4 } });
      expect(await addresses()).toHaveLength(8);
      // The customers were not touched, and no password was set by an address.
      const ann = (
        await q(
          `SELECT password FROM customer WHERE email = 'wa-ann@example.com'`
        )
      )[0];
      expect(bcrypt.compareSync('Secret-1', ann.password)).toBe(true);
    } finally {
      await t.close();
    }
  });

  it('stops at the check with the errors of core, placed on their columns, and adds nothing', async () => {
    const t = await setup();
    try {
      await t.run('customer', CUSTOMERS);
      const { checked, done, state, issues } = await t.run(
        'customerAddress',
        fileOf(
          [
            'wa-ann@example.com',
            'Ann',
            '',
            '',
            '',
            '1 Market Street',
            '',
            'San Francisco',
            'California',
            'ABC',
            'US',
            '',
            '',
            '1'
          ],
          [
            'nobody@example.com',
            'Nobody',
            '',
            '',
            '',
            '1 Market Street',
            '',
            'San Francisco',
            'US-CA',
            '94105',
            'US',
            '415-555-0100',
            '',
            '1'
          ],
          [
            'wa-bob@example.com',
            'Bob',
            '',
            '',
            '',
            '1 Rue',
            '',
            'Paris',
            '',
            '75001',
            'ZZ',
            '+33123456789',
            '',
            ''
          ]
        )
      );
      expect(checked.outcome).toBe('validated');
      expect(done).toBeNull();
      expect(state).toMatchObject({ status: 'validated' });
      const placed = issues
        .map((i) => `${i.rowNumber}:${i.code}:${i.column}`)
        .sort();
      expect(placed).toEqual([
        '2:ADDRESS_INVALID:administrative_area',
        '2:ADDRESS_INVALID:postal_code',
        '2:ADDRESS_INVALID:telephone',
        '3:REFERENCE_NOT_FOUND:email',
        '4:INVALID_VALUE:country'
      ]);
      expect(await addresses()).toEqual([]);
    } finally {
      await t.close();
    }
  });
});
