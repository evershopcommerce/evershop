import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { PgJobAdmin } from '../../../adapters/PgJobAdmin.js';
import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import { ImportService } from '../../../services/jobs/ImportService.js';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { composeWorker } from '../../../worker/compose.js';
import type { CorePorts } from '../../../worker/compose.js';
import { runWorker } from '../../../worker/runWorker.js';
import { entityServicesContract } from '../helpers/entityServicesContract.js';
import type { ServicesHarness } from '../helpers/entityServicesContract.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * The worker on core's real category services, in the second scratch database
 * (a copy of the core schema with no store running on it). Core's own pool is
 * pointed at it before anything reaches that pool, so the services write to
 * `public.category` and fire the real triggers. Each test removes what it made.
 */
jest.setTimeout(60_000);

const db = await openScratchDb({ core: true });
if (db) pointCoreAt(db);
const describeDb = db ? describe : describe.skip;

// Core is imported after its pool has been pointed at the scratch database.
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

/** What was there before the tests: they remove what is above it. */
let baseline = { category: 0, event: 0 };

async function remember() {
  const rows = await db!.pool.query(
    `SELECT COALESCE((SELECT max(category_id) FROM category), 0) AS category,
            COALESCE((SELECT max(event_id) FROM event), 0) AS event`
  );
  baseline = {
    category: Number(rows.rows[0].category),
    event: Number(rows.rows[0].event)
  };
}

async function cleanUp() {
  await db!.pool.query('DELETE FROM category WHERE category_id > $1', [
    baseline.category
  ]);
  await db!.pool.query('DELETE FROM event WHERE event_id > $1', [
    baseline.event
  ]);
}

const FIND = `
  SELECT c.category_id AS id, c.uuid, cd.url_key, cd.name, cd.image, c.status,
         parent.url_key AS parent_url_key
    FROM category c
    JOIN category_description cd ON cd.category_description_category_id = c.category_id
    LEFT JOIN category_description parent
           ON parent.category_description_category_id = c.parent_id`;

async function realServicesHarness(): Promise<ServicesHarness> {
  await cleanUp();
  await remember();
  return {
    services: createCoreEntityServices!(db!.pool),
    async find(urlKey) {
      const result = await db!.pool.query(`${FIND} WHERE cd.url_key = $1`, [
        urlKey
      ]);
      const row = result.rows[0];
      return row
        ? {
            id: row.id,
            uuid: row.uuid,
            name: row.name,
            status: row.status ? 1 : 0,
            parentUrlKey: row.parent_url_key
          }
        : null;
    },
    async count() {
      const result = await db!.pool.query(
        'SELECT count(*)::int AS n FROM category WHERE category_id > $1',
        [baseline.category]
      );
      return result.rows[0].n;
    }
  };
}

describeDb('the real category services of core', () => {
  entityServicesContract('CoreEntityServices', realServicesHarness);

  afterAll(async () => {
    await cleanUp();
  });
});

describeDb('the worker on the real services', () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  const logger = new CollectingLogger();

  const setup = async (
    limits = { maxRows: 1000, maxCellLength: 65_536, maxIssues: 1000 }
  ) => {
    await cleanUp();
    await remember();
    // An image server for the rows that name an image.
    const server = http.createServer((request, response) => {
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Content-Length', String(PNG.length));
      response.end(PNG);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const imageUrl = `http://127.0.0.1:${
      (server.address() as AddressInfo).port
    }/women.png`;
    const stored: Array<{ directory: string; fileName: string }> = [];
    const ports: CorePorts = {
      pool: db!.pool,
      services: createCoreEntityServices!(db!.pool),
      routePaths: () => ['/cart'],
      enabledLanguages: async () => ['en'],
      async storeImage(file) {
        stored.push({ directory: file.directory, fileName: file.fileName });
        return { url: `/assets/${file.directory}/${file.fileName}` };
      },
      ownStorage: () => [],
      allowedImageTypes: () => ['image/png'],
      maxImageBytesForType: () => 1_000_000,
      sanitizeFileName: (name) => name,
      logger,
      limits,
      // The defaults of the settings; the pool is the real event queue of the database.
      backlog: {
        eventBacklogHigh: 500,
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
    // The pool of the test has the private schema first; the tables of the import are there.
    await db!.pool.query('TRUNCATE import_job RESTART IDENTITY CASCADE');
    const worker = (uuid: string) =>
      runWorker(uuid, {
        deps: composed.deps,
        admin: composed.admin,
        workerId: 'test:1'
      });
    const upload = async (text: string) => {
      async function* once() {
        yield Buffer.from(text);
      }
      return service.upload({
        entity: 'category',
        fileName: 'categories.csv',
        createdBy: null,
        file: once()
      });
    };
    const rows = async (keys: string[]) =>
      (
        await db!.pool.query(
          `${FIND} WHERE cd.url_key = ANY($1) ORDER BY cd.url_key`,
          [keys]
        )
      ).rows;
    let workerClosed = false;
    const openConnections = () =>
      new Promise<number>((resolve) => {
        server.getConnections((_error, count) => resolve(count));
      });
    return {
      composed,
      openConnections,
      service,
      worker,
      upload,
      rows,
      imageUrl,
      stored,
      // The worker is closed once: the downloader's agent refuses a second close.
      async closeWorker() {
        if (!workerClosed) {
          workerClosed = true;
          await composed.close();
        }
      },
      async close() {
        try {
          await this.closeWorker();
        } finally {
          await new Promise((resolve) => {
            server.close(resolve);
          });
          await cleanUp();
        }
      }
    };
  };

  const row = (key: string, more: Record<string, string> = {}) =>
    categoryRow({ url_key: key, name: key.toUpperCase(), image: '', ...more });

  it('checks a file, imports it, and imports it again as updates', async () => {
    const t = await setup();
    try {
      // 1. Upload, check.
      const first = categoryFile(
        row('women', { image: t.imageUrl }),
        row('shoes', { parent: 'women' }),
        row('kids')
      );
      const { job } = await t.upload(first);
      expect(await t.worker(job.uuid)).toEqual({
        outcome: 'validated',
        exitCode: 0
      });
      expect(await t.composed.admin.get(job.id)).toMatchObject({
        status: 'validated',
        counts: { total: 3, createRows: 3, updateRows: 0, errors: 0 }
      });

      // 2. Start, import.
      expect(await t.service.start(job.id)).toMatchObject({ status: 'queued' });
      expect(await t.worker(job.uuid)).toEqual({
        outcome: 'completed',
        exitCode: 0
      });
      expect(await t.composed.admin.get(job.id)).toMatchObject({
        status: 'completed',
        counts: { created: 3, updated: 0, failed: 0, skipped: 0, lastUnit: 3 }
      });
      // The job is kept for the time the wiring is given (one day here, not the default).
      const finished = await t.composed.admin.get(job.id);
      expect(finished!.expiresAt).toBeGreaterThan(
        Date.now() + 86_400_000 - 60_000
      );
      expect(finished!.expiresAt).toBeLessThan(
        Date.now() + 86_400_000 + 60_000
      );
      let found = await t.rows(['women', 'shoes', 'kids']);
      expect(found.map((r) => [r.url_key, r.name, r.parent_url_key])).toEqual([
        ['kids', 'KIDS', null],
        ['shoes', 'SHOES', 'women'],
        ['women', 'WOMEN', null]
      ]);
      // The image went through the SSRF guard and the storage.
      expect(t.stored).toHaveLength(1);
      expect(found.find((r) => r.name === 'WOMEN').image).toBe(
        `/assets/${t.stored[0].directory}/${t.stored[0].fileName}`
      );

      // 3. The same keys again, with new names: updates, no copies.
      const second = categoryFile(
        row('women', { name: 'Ladies', image: t.imageUrl }),
        row('shoes', { name: 'Footwear', parent: 'women' }),
        row('kids', { name: 'Children' })
      );
      const again = await t.upload(second);
      expect(again.replaced).toBe(false);
      await t.worker(again.job.uuid);
      await t.service.start(again.job.id);
      expect((await t.worker(again.job.uuid)).outcome).toBe('completed');
      expect(await t.composed.admin.get(again.job.id)).toMatchObject({
        counts: { created: 0, updated: 3, failed: 0 }
      });
      found = await t.rows(['women', 'shoes', 'kids']);
      expect(found.map((r) => r.name)).toEqual([
        'Children',
        'Footwear',
        'Ladies'
      ]);
      const total = await db!.pool.query(
        'SELECT count(*)::int AS n FROM category WHERE category_id > $1',
        [baseline.category]
      );
      expect(total.rows[0].n).toBe(3);
      // The image was read again and replaced, not added again.
      expect(t.stored).toHaveLength(2);
      expect(t.stored[1]).toEqual(t.stored[0]);

      // Closing ends what the downloader holds open (its connections to image servers).
      expect(await t.openConnections()).toBeGreaterThan(0);
      await t.closeWorker();
      let left = await t.openConnections();
      for (let waited = 0; left > 0 && waited < 1000; waited += 25) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(resolve, 25);
        });
        // eslint-disable-next-line no-await-in-loop
        left = await t.openConnections();
      }
      expect(left).toBe(0);
    } finally {
      await t.close();
    }
  });

  it('refuses a url_key that a route or a language already uses, as the store would', async () => {
    const t = await setup();
    try {
      // /cart is a route and "en" is an enabled language: the wiring gives both.
      const { job } = await t.upload(
        categoryFile(row('cart'), row('en'), row('fine'))
      );
      expect((await t.worker(job.uuid)).outcome).toBe('validated');
      const done = await t.composed.admin.get(job.id);
      expect(done?.counts.errors).toBe(2);
      expect(done?.counts.byCode.validate).toEqual({ URL_KEY_RESERVED: 2 });
      expect(await t.service.start(job.id).catch((e) => e.code)).toBe(
        'FILE_HAS_ERRORS'
      );
    } finally {
      await t.close();
    }
  });

  it('checks a file with the limits it is given', async () => {
    const t = await setup({
      maxRows: 2,
      maxCellLength: 65_536,
      maxIssues: 1000
    });
    try {
      const { job } = await t.upload(
        categoryFile(row('one'), row('two'), row('three'))
      );
      await t.worker(job.uuid);
      const done = await t.composed.admin.get(job.id);
      expect(done?.counts.byCode.validate).toEqual({ FILE_TOO_LARGE: 1 });
    } finally {
      await t.close();
    }
  });

  it('reports a row that the database refuses, skips the rows below it, and goes on', async () => {
    const t = await setup();
    const schema = 'public';
    await db!.pool.query(`
      CREATE FUNCTION ${schema}.import_test_refuse() RETURNS trigger AS $$
      BEGIN
        IF NEW.name = 'REFUSED' THEN
          RAISE EXCEPTION 'import test: this name is refused' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`);
    await db!.pool.query(`
      CREATE TRIGGER import_test_refuse BEFORE INSERT ON ${schema}.category_description
      FOR EACH ROW EXECUTE FUNCTION ${schema}.import_test_refuse()`);
    try {
      const { job } = await t.upload(
        categoryFile(
          row('refused'),
          row('under-refused', { parent: 'refused' }),
          row('fine')
        )
      );
      await t.worker(job.uuid);
      await t.service.start(job.id);
      expect((await t.worker(job.uuid)).outcome).toBe('completed');
      expect(await t.composed.admin.get(job.id)).toMatchObject({
        status: 'completed',
        counts: { created: 1, failed: 1, skipped: 1 }
      });
      // The failed create left nothing: one transaction, rolled back.
      const left = await t.rows(['refused', 'under-refused', 'fine']);
      expect(left.map((r) => r.name)).toEqual(['FINE']);
      const issues = await db!.pool.query(
        `SELECT row_number, code, params FROM import_job_issue
          WHERE import_job_id = $1 AND phase = 'import' ORDER BY row_number`,
        [job.id]
      );
      expect(issues.rows.map((r) => [r.row_number, r.code])).toEqual([
        [2, 'WRITE_FAILED'],
        [3, 'DEPENDENCY_FAILED']
      ]);
      expect(issues.rows[0].params).toMatchObject({ sqlState: '23514' });
    } finally {
      await db!.pool.query(
        `DROP TRIGGER import_test_refuse ON ${schema}.category_description`
      );
      await db!.pool.query(`DROP FUNCTION ${schema}.import_test_refuse()`);
      await t.close();
    }
  });
});
