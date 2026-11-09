// Helpers for the catalog specs: admin form controls, the REST/GraphQL calls
// used for set-up data, and a PNG made in memory for the image upload.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { expect, type Locator, type Page } from '@playwright/test';
import { adminStateFile } from './store';

/**
 * Give the plain `page` fixture the saved admin session (no login). Use it
 * instead of `adminPage` only on a page with a known bug that throws a page
 * error: `adminPage` reports every page error even when the test allows it,
 * while `watchErrors` (which watches `page`) honours `allowedErrors`.
 */
export async function signInAsAdmin(page: Page): Promise<void> {
  const state = JSON.parse(fs.readFileSync(adminStateFile(), 'utf8'));
  await page.context().addCookies(state.cookies);
}

/** Moved to support/test.ts; re-exported for the specs that import it from here. */
export { allowed } from './test';

/** A RadioGroupField option. base-ui renders a `[role=radio]` span labelled by
 *  `field-<name>-<value>-label`; the id itself sits on a hidden input. */
export function radio(
  page: Page,
  field: string,
  value: string | number
): Locator {
  return page.locator(
    `[role="radio"][aria-labelledby="field-${field}-${value}-label"]`
  );
}

export async function checkRadio(
  page: Page,
  field: string,
  value: string | number
): Promise<void> {
  const control = radio(page, field, value);
  await control.click();
  await expect(control).toHaveAttribute('aria-checked', 'true');
}

/** Click Save and wait for the form's API answer. Returns the parsed body. */
export async function saveForm(
  page: Page,
  method: string,
  urlPart: RegExp
): Promise<any> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        urlPart.test(new URL(r.url()).pathname) &&
        r.request().method() === method
    ),
    page.getByRole('button', { name: 'Save', exact: true }).click()
  ]);
  const body = await response.json();
  expect(
    response.ok(),
    `${method} ${response.url()} answered ${response.status()}: ${JSON.stringify(
      body?.error
    )}`
  ).toBeTruthy();
  expect(body?.error, 'API error').toBeFalsy();
  return body;
}

/** A REST call with the admin session of `page` (set-up data only). */
export async function adminApi(
  page: Page,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown
): Promise<any> {
  const res = await page.request.fetch(url, {
    method,
    data,
    headers: { 'Content-Type': 'application/json' }
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  expect(
    res.ok() && !json?.error,
    `${method} ${url} → ${res.status()}: ${(json?.error?.message || text).slice(
      0,
      300
    )}`
  ).toBeTruthy();
  return json?.data ?? json;
}

/** A storefront GraphQL query (public data, as a visitor sees it). */
export async function storefrontGraphql(
  page: Page,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<any> {
  const res = await page.request.post('/api/graphql', {
    data: { query, variables }
  });
  const json = await res.json();
  expect(
    res.ok() && !json.errors,
    `GraphQL → ${res.status()}: ${JSON.stringify(json.errors)}`
  ).toBeTruthy();
  return json.data;
}

// ---------------------------------------------------------------- PNG
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A solid-colour RGB PNG, `size` × `size` pixels. */
export function solidPng(
  size: number,
  [r, g, b]: [number, number, number]
): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x += 1) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
