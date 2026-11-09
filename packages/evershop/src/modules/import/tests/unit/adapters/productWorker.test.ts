import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { PgJobAdmin } from '../../../adapters/PgJobAdmin.js';
import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import { csvLine } from '../../../services/report/csvWrite.js';
import { ImportService } from '../../../services/jobs/ImportService.js';
import {
  PRODUCT_HEADER,
  productRow
} from '../../../services/rules/productFiles.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { composeWorker } from '../../../worker/compose.js';
import type { CorePorts } from '../../../worker/compose.js';
import { runWorker } from '../../../worker/runWorker.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * A products file through a worker on the real services, on the second scratch
 * database (a copy of the core schema with no store running on it): the check,
 * the writer, core's product, variant group and redirect services, and the
 * processors the catalog module registers, which fold the custom fields into
 * `meta_data`. Each test removes what it made.
 */
jest.setTimeout(120_000);

process.env.SUPPRESS_NO_CONFIG_WARNING = '1';
process.env.SUPPRESS_STRICTNESS_CHECK = '1';
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

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
if (db) {
  // The module registers its processors once, as core does at boot.
  (await import('../../../../catalog/bootstrap.js')).default();
}

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;

let eventBaseline = 0;

async function cleanUp() {
  await q(`DELETE FROM product WHERE sku ~ '^WK-'`);
  await q(`DELETE FROM url_rewrite WHERE request_path ~ '^/(worker-cat|wk-)'`);
  await q(
    `DELETE FROM variant_group WHERE attribute_group_id IN
       (SELECT attribute_group_id FROM attribute_group WHERE group_name = 'Worker group')`
  );
  await q(`DELETE FROM url_redirect WHERE from_path LIKE '/wk-old/%'`);
  await q(`DELETE FROM attribute WHERE attribute_code IN ('color','size')`);
  await q(`DELETE FROM package WHERE name = 'Worker box'`);
  await q(
    `DELETE FROM category WHERE category_id IN
       (SELECT category_description_category_id FROM category_description WHERE url_key = 'worker-cat')`
  );
  await q(`DELETE FROM metafield_definition WHERE owner_type = 'product'`);
  // The first attribute group and tax class of a database are the default ones,
  // and a trigger refuses to delete them; this database has none of a store's own.
  await q(
    `DO $$ BEGIN
       ALTER TABLE attribute_group DISABLE TRIGGER USER;
       ALTER TABLE tax_class DISABLE TRIGGER USER;
       DELETE FROM attribute_group WHERE group_name = 'Worker group';
       DELETE FROM tax_class WHERE name = 'Worker tax';
       ALTER TABLE attribute_group ENABLE TRIGGER USER;
       ALTER TABLE tax_class ENABLE TRIGGER USER;
     END $$`
  );
  await q('DELETE FROM event WHERE event_id > $1', [eventBaseline]);
}

async function seed() {
  await q(
    `ALTER TABLE url_redirect ADD COLUMN IF NOT EXISTS status_code SMALLINT NOT NULL DEFAULT 302`
  );
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  await cleanUp();
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  const [{ attribute_group_id: groupId }] = await q(
    `INSERT INTO attribute_group (group_name) VALUES ('Worker group') RETURNING attribute_group_id`
  );
  const attributes: Array<[string, string[]]> = [
    ['color', ['Black', 'White']],
    ['size', ['S', 'M']]
  ];
  for (const [code, options] of attributes) {
    // eslint-disable-next-line no-await-in-loop
    const [row] = await q(
      `INSERT INTO attribute (attribute_code, attribute_name, type)
       VALUES ($1, $1, 'select') RETURNING attribute_id`,
      [code]
    );
    for (const text of options) {
      // eslint-disable-next-line no-await-in-loop
      await q(
        `INSERT INTO attribute_option (attribute_id, attribute_code, option_text)
         VALUES ($1, $2, $3)`,
        [row.attribute_id, code, text]
      );
    }
    // eslint-disable-next-line no-await-in-loop
    await q(
      'INSERT INTO attribute_group_link (attribute_id, group_id) VALUES ($1, $2)',
      [row.attribute_id, groupId]
    );
  }
  await q(
    `INSERT INTO package (name, length, width, height, is_default)
     VALUES ('Worker box', 1, 1, 1, false)`
  );
  await q(`INSERT INTO tax_class (name) VALUES ('Worker tax')`);
  const [{ category_id: categoryId }] = await q(
    `INSERT INTO category (status) VALUES (true) RETURNING category_id`
  );
  await q(
    `INSERT INTO category_description (category_description_category_id, name, url_key)
     VALUES ($1, 'Worker category', 'worker-cat')`,
    [categoryId]
  );
  await q(
    `INSERT INTO url_rewrite (request_path, target_path, entity_uuid, entity_type)
     SELECT '/worker-cat', '/category/' || uuid, uuid, 'category'
       FROM category WHERE category_id = $1`,
    [categoryId]
  );
  const definitions: Array<[string, string, boolean, boolean, unknown[]]> = [
    ['material', 'short_text', false, true, []],
    ['years', 'integer', false, false, [{ type: 'range', min: 0, max: 50 }]],
    ['care', 'short_text', true, false, []]
  ];
  for (const [key, type, isList, required, validations] of definitions) {
    // eslint-disable-next-line no-await-in-loop
    await q(
      `INSERT INTO metafield_definition
         (owner_type, namespace, field_key, name, field_type, is_list, required, validations)
       VALUES ('product', 'custom', $1, $1, $2, $3, $4, $5::jsonb)`,
      [key, type, isList, required, JSON.stringify(validations)]
    );
  }
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const EXTRA = [
  'metafield:custom.material',
  'metafield:custom.years',
  'metafield:custom.care'
];

/** A row for the store this test made, and its custom-field cells. */
function row(
  sku: string,
  values: Parameters<typeof productRow>[0],
  custom: [material: string, years: string, care: string]
): string {
  return `${productRow({
    sku,
    url_key: sku.toLowerCase(),
    name: sku,
    attribute_group: 'Worker group',
    package: 'Worker box',
    tax_class: 'Worker tax',
    category: 'worker-cat',
    images: '',
    ...values
  })},${csvLine(custom).trimEnd()}`;
}

const fileOf = (...rows: string[]) =>
  `${PRODUCT_HEADER},${csvLine(EXTRA).trimEnd()}\n${rows.join('\n')}\n`;

const group = (sku: string, color: string, size: string) => ({
  variant_group: 'wk-tee',
  variant_axes: 'color|size',
  'attr:color': color,
  'attr:size': size,
  ...(sku === 'WK-TEE-1' ? { redirect_from: '/wk-old/tee-1' } : {})
});

describeDb('a products file through a worker on the real services', () => {
  const logger = new CollectingLogger();

  const setup = async (options: { loseEvents?: boolean } = {}) => {
    await seed();
    const real = createCoreEntityServices!(db!.pool);
    // The event process was restarted while it worked: core counts the events it
    // was handling as lost, and the products never get their page address.
    const services = options.loseEvents
      ? {
          ...real,
          async createProduct(input: Parameters<typeof real.createProduct>[0]) {
            const made = await real.createProduct(input);
            await q(
              `DELETE FROM event WHERE name = 'product_created'
                AND (data->>'product_id')::int = $1`,
              [made.id]
            );
            return made;
          }
        }
      : real;
    // The image server counts what it is asked for and how many at once.
    const hits = new Map<string, number>();
    let active = 0;
    let peak = 0;
    const server = http.createServer((request, response) => {
      hits.set(request.url ?? '', (hits.get(request.url ?? '') ?? 0) + 1);
      active += 1;
      peak = Math.max(peak, active);
      setTimeout(() => {
        response.setHeader('Content-Type', 'image/png');
        response.setHeader('Content-Length', String(PNG.length));
        response.end(PNG, () => {
          active -= 1;
        });
      }, 60);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const imageUrl = `http://127.0.0.1:${
      (server.address() as AddressInfo).port
    }/mug.png`;
    const ports: CorePorts = {
      pool: db!.pool,
      services,
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
    const upload = (text: string) =>
      service.upload({
        entity: 'product',
        fileName: 'products.csv',
        createdBy: null,
        file: (async function* once() {
          yield Buffer.from(text);
        })()
      });
    /** Upload, check, start, import: the whole life of a job. */
    const run = async (text: string) => {
      const { job } = await upload(text);
      const checked = await worker(job.uuid);
      if (checked.outcome !== 'validated') return { job, checked, done: null };
      const state = await composed.admin.get(job.id);
      if (state!.counts.errors > 0) return { job, checked, done: null };
      await service.start(job.id);
      return { job, checked, done: await worker(job.uuid) };
    };
    return {
      composed,
      imageUrl,
      imageBase: imageUrl.replace('/mug.png', ''),
      hits,
      peak: () => peak,
      run,
      upload,
      worker,
      service,
      async close() {
        try {
          await composed.close();
        } finally {
          await new Promise((resolve) => {
            server.close(resolve);
          });
          await cleanUp();
        }
      }
    };
  };

  const products = () =>
    q(
      `SELECT p.sku, pd.name, pd.url_key, p.price::float8 AS price, i.qty, p.status,
              p.variant_group_id, p.meta_data, c.url_key AS category
         FROM product p
         JOIN product_description pd ON pd.product_description_product_id = p.product_id
         LEFT JOIN product_inventory i ON i.product_inventory_product_id = p.product_id
         LEFT JOIN category_description c ON c.category_description_category_id = p.category_id
        WHERE p.sku ~ '^WK-' ORDER BY p.sku COLLATE "C"`
    );

  it('checks, imports, and imports again as updates: variant group, redirect, image, custom fields', async () => {
    const t = await setup();
    try {
      const first = fileOf(
        row('WK-TEE-1', group('WK-TEE-1', 'Black', 'S'), [
          'Cotton',
          '3',
          'wash|dry'
        ]),
        row('WK-TEE-2', group('WK-TEE-2', 'Black', 'M'), ['Cotton', '3', '']),
        row('WK-TEE-3', group('WK-TEE-3', 'White', 'S'), ['Linen', '', '']),
        row('WK-MUG-1', { images: t.imageUrl, price: '9.50', qty: '12' }, [
          'Ceramic',
          '1',
          ''
        ])
      );
      const { job, checked, done } = await t.run(first);
      expect(checked).toEqual({ outcome: 'validated', exitCode: 0 });
      expect(done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(await t.composed.admin.get(job.id)).toMatchObject({
        status: 'completed',
        counts: {
          created: 4,
          updated: 0,
          failed: 0,
          total: 4,
          lastUnit: 2,
          // The events of the products are waiting for the event process: not lost.
          pagesRebuilt: 0
        }
      });

      let found = await products();
      expect(
        found.map((p) => [p.sku, p.name, p.category, p.price, p.qty])
      ).toEqual([
        ['WK-MUG-1', 'WK-MUG-1', 'worker-cat', 9.5, 12],
        ['WK-TEE-1', 'WK-TEE-1', 'worker-cat', 24, 40],
        ['WK-TEE-2', 'WK-TEE-2', 'worker-cat', 24, 40],
        ['WK-TEE-3', 'WK-TEE-3', 'worker-cat', 24, 40]
      ]);
      // The group: the three members share one, the mug has none.
      const groups = new Set(
        found.filter((p) => /TEE/.test(p.sku)).map((p) => p.variant_group_id)
      );
      expect(groups.size).toBe(1);
      expect([...groups][0]).not.toBeNull();
      expect(
        found.find((p) => p.sku === 'WK-MUG-1').variant_group_id
      ).toBeNull();
      // The custom fields went through the processors of the catalog module.
      expect(found.map((p) => p.meta_data)).toEqual([
        { custom: { material: 'Ceramic', years: 1 } },
        { custom: { material: 'Cotton', years: 3, care: ['wash', 'dry'] } },
        { custom: { material: 'Cotton', years: 3 } },
        { custom: { material: 'Linen' } }
      ]);
      // The old address, as a permanent redirect to the path of the product (under its category).
      expect(
        await q(
          `SELECT to_path, status_code FROM url_redirect WHERE from_path = '/wk-old/tee-1'`
        )
      ).toEqual([{ to_path: '/worker-cat/wk-tee-1', status_code: 301 }]);
      // The image of the mug.
      expect(
        (
          await q(
            `SELECT count(*)::int AS n FROM product_image pi JOIN product p ON p.product_id = pi.product_image_product_id WHERE p.sku = 'WK-MUG-1'`
          )
        )[0].n
      ).toBeGreaterThanOrEqual(1);

      // The same file again with one custom cell changed: updates, no copies, and
      // the fields the file does not mention are kept (core replaces the whole set).
      const second = fileOf(
        row('WK-TEE-1', group('WK-TEE-1', 'Black', 'S'), [
          'Organic cotton',
          '3',
          'wash|dry'
        ]),
        row('WK-TEE-2', group('WK-TEE-2', 'Black', 'M'), ['Cotton', '3', '']),
        row('WK-TEE-3', group('WK-TEE-3', 'White', 'S'), ['Linen', '', '']),
        row('WK-MUG-1', { images: t.imageUrl, price: '9.50', qty: '12' }, [
          'Ceramic',
          '1',
          ''
        ])
      );
      const again = await t.run(second);
      expect(again.done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(await t.composed.admin.get(again.job.id)).toMatchObject({
        counts: { created: 0, updated: 4, failed: 0 }
      });
      found = await products();
      expect(found).toHaveLength(4);
      expect(found.find((p) => p.sku === 'WK-TEE-1').meta_data).toEqual({
        custom: { material: 'Organic cotton', years: 3, care: ['wash', 'dry'] }
      });

      // A file with one custom column changes that field and keeps the others:
      // the writer sends the stored set with the cell laid over it.
      const narrow = await t.run('sku,metafield:custom.years\nWK-TEE-1,7\n');
      expect(narrow.done).toEqual({ outcome: 'completed', exitCode: 0 });
      found = await products();
      expect(found.find((p) => p.sku === 'WK-TEE-1').meta_data).toEqual({
        custom: { material: 'Organic cotton', years: 7, care: ['wash', 'dry'] }
      });
      expect(found.find((p) => p.sku === 'WK-TEE-2').meta_data).toEqual({
        custom: { material: 'Cotton', years: 3 }
      });
    } finally {
      await t.close();
    }
  });

  it('writes the creation event again for the products whose event was lost, and the real subscriber gives them their page address (IMP-08)', async () => {
    const t = await setup({ loseEvents: true });
    try {
      const { job, done } = await t.run(
        fileOf(
          row('WK-MUG-1', {}, ['Ceramic', '1', '']),
          row('WK-MUG-2', {}, ['Glass', '2', ''])
        )
      );
      expect(done).toEqual({ outcome: 'completed', exitCode: 0 });
      expect(await t.composed.admin.get(job.id)).toMatchObject({
        status: 'completed',
        counts: { created: 2, failed: 0, pagesRebuilt: 2 }
      });
      const pending = await q(
        `SELECT e.data FROM event e
          WHERE e.name = 'product_created' AND e.status = 'pending' AND e.event_id > $1
          ORDER BY e.event_id`,
        [eventBaseline]
      );
      expect(pending.map((e) => e.data.sku)).toEqual(['WK-MUG-1', 'WK-MUG-2']);
      // What the event process does with them.
      const build = (
        await import(
          '../../../../catalog/subscribers/product_created/buildUrlRewrite.js'
        )
      ).default;
      for (const event of pending) {
        // eslint-disable-next-line no-await-in-loop
        await build(event.data);
      }
      expect(
        (
          await q(
            `SELECT request_path FROM url_rewrite WHERE entity_uuid IN
               (SELECT uuid FROM product WHERE sku LIKE 'WK-MUG-%') ORDER BY request_path COLLATE "C"`
          )
        ).map((r) => r.request_path)
      ).toEqual(['/worker-cat/wk-mug-1', '/worker-cat/wk-mug-2']);
    } finally {
      await t.close();
    }
  });

  it('downloads an image shared by many products once, and different images several at a time (imageConcurrency)', async () => {
    const t = await setup();
    try {
      const rows = Array.from({ length: 8 }, (_, i) =>
        row(
          `WK-IMG-${i}`,
          { images: `${t.imageBase}/own-${i}.png|${t.imageBase}/shared.png` },
          ['Cotton', '1', '']
        )
      );
      const { done } = await t.run(fileOf(...rows));
      expect(done).toEqual({ outcome: 'completed', exitCode: 0 });
      // One download for the image all eight share, one for each of the others.
      expect(t.hits.get('/shared.png')).toBe(1);
      for (let i = 0; i < 8; i += 1) {
        expect(t.hits.get(`/own-${i}.png`)).toBe(1);
      }
      // Four at a time, not one after the other.
      expect(t.peak()).toBeGreaterThan(1);
      expect(t.peak()).toBeLessThanOrEqual(4);
      const stored = await q(
        `SELECT p.sku, count(i.*)::int AS n FROM product p
           JOIN product_image i ON i.product_image_product_id = p.product_id
          WHERE p.sku LIKE 'WK-IMG-%' GROUP BY p.sku ORDER BY p.sku COLLATE "C"`
      );
      expect(stored.map((r) => r.n)).toEqual(Array(8).fill(2));
    } finally {
      await t.close();
    }
  });

  it('stops at the check with a value the store would refuse, and writes nothing', async () => {
    const t = await setup();
    try {
      const { job, checked, done } = await t.run(
        fileOf(
          row('WK-MUG-1', {}, ['Ceramic', '99', '']),
          row('WK-MUG-2', {}, ['', '1', ''])
        )
      );
      expect(checked.outcome).toBe('validated');
      expect(done).toBeNull();
      expect(await t.composed.admin.get(job.id)).toMatchObject({
        status: 'validated',
        counts: { errors: 2 }
      });
      expect(await products()).toEqual([]);
    } finally {
      await t.close();
    }
  });
});
