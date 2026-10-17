import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { validateCategories } from '../helpers/runValidation.js';

/**
 * The categories example file of the specification is a golden fixture: it must
 * be valid against a store that has the custom field it uses.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const template = readFileSync(
  path.resolve(here, '../../fixtures/categories.csv')
);
const STORE = { metafields: { category: ['custom.banner_color'] } };
const KEYS = [
  'apparel',
  't-shirts',
  'hoodies',
  'accessories',
  'bags',
  'archive'
];

describe('the categories example file', () => {
  it('is valid, and creates its six categories', async () => {
    const result = await validateCategories(template, { store: STORE });
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({
      totalRows: 6,
      createRows: 6,
      updateRows: 0,
      errors: 0,
      warnings: 0
    });
  });

  it('updates all six when they exist, and a create-only import then refuses them all', async () => {
    const store = {
      ...STORE,
      categories: KEYS.map((urlKey) => ({ urlKey }))
    };
    const update = await validateCategories(template, {
      store,
      mode: 'update'
    });
    expect(update.issues).toEqual([]);
    expect(update.summary).toMatchObject({ createRows: 0, updateRows: 6 });
    const create = await validateCategories(template, {
      store,
      mode: 'create'
    });
    expect(create.issues.map((issue) => issue.code)).toEqual(
      Array(6).fill('ALREADY_EXISTS')
    );
  });

  it('needs the custom field: without it the column is reported once, at the file', async () => {
    const result = await validateCategories(template);
    expect(result.issues).toMatchObject([
      {
        code: 'REFERENCE_NOT_FOUND',
        column: 'metafield:custom.banner_color'
      }
    ]);
    expect(result.issues[0].rowNumber).toBeUndefined();
  });

  it('says the same about the file saved by Excel: a byte order mark and CRLF line breaks', async () => {
    const excel = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(template.toString('utf8').replace(/\r?\n/g, '\r\n'))
    ]);
    const plain = await validateCategories(template, { store: STORE });
    const saved = await validateCategories(excel, { store: STORE });
    expect(saved.issues).toEqual(plain.issues);
    expect(saved.summary).toEqual(plain.summary);
  });

  it('finds a mistake in one cell and reports only that', async () => {
    const broken = template
      .toString('utf8')
      .replace('t-shirts,T-Shirts,apparel,1,1', 't-shirts,T-Shirts,aparel,1,1');
    const result = await validateCategories(broken, { store: STORE });
    expect(result.issues).toMatchObject([
      {
        code: 'REFERENCE_NOT_FOUND',
        rowNumber: 3,
        column: 'parent',
        value: 'aparel'
      }
    ]);
    expect(result.keys).toEqual(['t-shirts']);
  });
});
