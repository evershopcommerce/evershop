import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, expect } from '@playwright/test';
import { productImages, productRow, referenceNames, sweepImportWorld } from '../../../shared/importDb.js';
import {
  startAndWaitForDone,
  uploadFile,
  viewText,
  waitForChecked,
  writeCsv
} from '../../../shared/importPage.js';

/**
 * Images (spec § 11.4, "images"): a local fixture server serves the pictures, in
 * several formats, and the import copies each into the store's own storage with
 * the extension of its content type. A picture that is not one fails its row.
 *
 * The fixture server runs on 127.0.0.1, which the store refuses unless it was
 * started with `system.import.allowPrivateNetworks` (the test switch of the
 * image fetcher), so the spec runs only where it is told that the store was:
 *   NODE_CONFIG='{"system":{"import":{"allowPrivateNetworks":true}}}'   (the store)
 *   IMPORT_E2E_PRIVATE_NETWORKS=1                                         (the specs)
 * The store and the specs must run on the same machine (CI does).
 */
test.skip(
  process.env.IMPORT_E2E_PRIVATE_NETWORKS !== '1',
  'needs a store started with system.import.allowPrivateNetworks (IMPORT_E2E_PRIVATE_NETWORKS=1)'
);
test.describe.configure({ mode: 'serial', timeout: 240_000 });

test.beforeAll(sweepImportWorld);
test.afterEach(sweepImportWorld);
test.afterAll(sweepImportWorld);

// One-pixel pictures: the smallest valid files of each type.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);
const WEBP = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');

const PICTURES: Record<string, { type: string; body: Buffer; status?: number }> = {
  '/pics/blue.png': { type: 'image/png', body: PNG },
  // no extension in the URL: the type of the answer says what it is
  '/pics/photo': { type: 'image/jpeg', body: JPEG },
  // the URL says SVG, the answer is a PNG (IMG-07: the extension comes from the answer)
  '/pics/art.svg': { type: 'image/png', body: PNG },
  '/pics/clip.webp': { type: 'image/webp', body: WEBP },
  // not pictures
  '/pics/page': { type: 'text/html', body: Buffer.from('<html>not a picture</html>') },
  '/pics/logo.svg': { type: 'image/svg+xml', body: SVG },
  '/pics/gone': { type: 'text/plain', body: Buffer.from('gone'), status: 404 }
};

let server: http.Server;
let base = '';

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const picture = PICTURES[(req.url ?? '').split('?')[0]];
    if (!picture) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(picture.status ?? 200, {
      'content-type': picture.type,
      'content-length': picture.body.length
    });
    res.end(req.method === 'HEAD' ? undefined : picture.body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const HEADER = [
  'sku', 'name', 'url_key', 'status', 'visibility', 'price', 'qty', 'attribute_group',
  'no_shipping_required', 'manage_stock', 'stock_availability', 'tax_class', 'images'
];

test('pictures are copied into the store with the extension of their type; a picture that is not one fails its row; the same file again adds no copy', async ({ page, request }, info) => {
  const { group, taxClass } = await referenceNames();
  const product = (n: number, images: string[]) => [
    `E2E-IMP-IMG-${n}`, `Pictures ${n}`, `e2e-imp-img-${n}`, '1', '1', '9.99', '5', group,
    '1', '0', '1', taxClass ?? '', images.map((p) => `${base}${p}`).join('|')
  ];
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-images.csv', [
    HEADER,
    product(1, ['/pics/blue.png', '/pics/photo', '/pics/art.svg', '/pics/clip.webp']),
    product(2, ['/pics/page']),
    product(3, ['/pics/logo.svg']),
    product(4, ['/pics/gone'])
  ]);
  await uploadFile(page, 'Products', file);
  await waitForChecked(page);
  // the check does not fetch the pictures: it cannot know which are pictures
  expect(await viewText(page)).toMatch(/All 4 rows are valid/);
  await startAndWaitForDone(page);
  expect(await viewText(page)).toContain('Created 1 - Updated 0 - Failed 3 - Skipped 0');

  // each picture that is not one fails its row, with its type of problem
  const table = page.getByTestId('problems');
  await expect(table.getByRole('row')).toHaveCount(1 + 3);
  await expect(table).toContainText('IMAGE_UNREADABLE x3');
  for (const n of [2, 3, 4]) {
    await expect(table).toContainText(`E2E-IMP-IMG-${n}`);
    expect(await productRow(`E2E-IMP-IMG-${n}`)).toBeNull();
  }

  // the good product has its four pictures, the first one is the main one
  const stored = await productImages('E2E-IMP-IMG-1');
  expect(stored).toHaveLength(4);
  expect(stored.map((p) => p.slice(p.lastIndexOf('.')))).toEqual(['.png', '.jpg', '.png', '.webp']);
  // they are in the store's own storage, and the store serves them as pictures
  const magic: Record<string, number[]> = {
    '.png': [0x89, 0x50, 0x4e, 0x47],
    '.jpg': [0xff, 0xd8, 0xff],
    '.webp': [0x52, 0x49, 0x46, 0x46]
  };
  for (const path of stored) {
    expect(path).not.toContain('127.0.0.1');
    const answer = await request.get(path);
    expect(answer.status(), path).toBe(200);
    expect(answer.headers()['content-type']).toMatch(/^image\//);
    const bytes = await answer.body();
    const expected = magic[path.slice(path.lastIndexOf('.'))];
    expect([...bytes.subarray(0, expected.length)], path).toEqual(expected);
  }

  // The same product again: its pictures are replaced by the same files, not added to.
  const again = writeCsv(info.outputPath('files'), 'e2e-imp-images-again.csv', [
    HEADER,
    product(1, ['/pics/blue.png', '/pics/photo', '/pics/art.svg', '/pics/clip.webp'])
  ]);
  await uploadFile(page, 'Products', again);
  await waitForChecked(page);
  await startAndWaitForDone(page);
  expect(await viewText(page)).toContain('Created 0 - Updated 1 - Failed 0 - Skipped 0');
  expect(await productImages('E2E-IMP-IMG-1')).toEqual(stored);
});
