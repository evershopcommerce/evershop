import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { getAjv } from '../../../base/services/getAjv.js';
import {
  createRecordingBuilder,
  definedEntries
} from '../../../base/tests/unit/helpers/recordingQueryBuilder.js';
import updateCategoryPayloadSchema from '../../api/updateCategory/payloadSchema.json' with { type: 'json' };
import updateCollectionPayloadSchema from '../../api/updateCollection/payloadSchema.json' with { type: 'json' };
import updateProductPayloadSchema from '../../api/updateProduct/payloadSchema.json' with { type: 'json' };

/**
 * Core issue #1103: an update that carries only the fields to change must leave
 * every other column alone. The services validate the payload IN PLACE and then
 * write the same object, so a schema `default` for an omitted field was written
 * back as if the caller had sent it (description [], tax_class null,
 * category_id null; description [], parent_id null).
 */
const db = createRecordingBuilder();

jest.unstable_mockModule('@evershop/postgres-query-builder', () => db.module);
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  getConnection: async () => ({})
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  info: () => undefined,
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined
}));
jest.unstable_mockModule('../../../base/services/recordRedirect.js', () => ({
  recordRedirect: async () => undefined,
  recordRedirectsBatch: async () => undefined
}));
jest.unstable_mockModule(
  '../../services/redirect/resolveCategoryUrlPath.js',
  () => ({ resolveCategoryUrlPath: async () => '' })
);

const { default: updateProduct } = await import(
  '../../services/product/updateProduct.js'
);
const { default: updateCategory } = await import(
  '../../services/category/updateCategory.js'
);

const storedProduct = {
  product_id: 1,
  uuid: 'p-1',
  url_key: 'canvas-tote',
  category_id: 5,
  tax_class: 3,
  package_id: 2,
  no_shipping_required: false,
  variant_group_id: null
};
const storedCategory = {
  category_id: 7,
  uuid: 'c-1',
  url_key: 'bags',
  parent_id: 2
};

describe('updateProduct with a partial payload (#1103)', () => {
  beforeEach(() => db.setRows({ product: { ...storedProduct } }));

  it('writes only the field that was sent', async () => {
    await updateProduct('p-1', { price: '12.00' } as any, {});

    const [productWrite] = db.writesTo('product');
    expect(productWrite.given).toEqual({ price: '12.00' });
    for (const write of db.writes) {
      expect(Object.keys(definedEntries(write.given))).toEqual(['price']);
    }
    expect(db.transaction).toEqual(['start', 'commit']);
  });

  it('still writes a value that is sent, null included', async () => {
    await updateProduct('p-1', { category_id: null } as any, {});

    const [productWrite] = db.writesTo('product');
    expect(productWrite.given).toEqual({ category_id: null });
  });

  it('still rejects an invalid value, and writes nothing', async () => {
    await expect(
      updateProduct('p-1', { price: '-1' } as any, {})
    ).rejects.toThrow();
    expect(db.writes).toEqual([]);
    expect(db.transaction).toEqual(['start', 'rollback']);
  });
});

describe('updateCategory with a partial payload (#1103)', () => {
  beforeEach(() => db.setRows({ category: { ...storedCategory } }));

  it('writes only the field that was sent', async () => {
    await updateCategory('c-1', { position: '3' } as any, {});

    const [categoryWrite] = db.writesTo('category');
    expect(categoryWrite.given).toEqual({ position: '3' });
    for (const write of db.writes) {
      expect(Object.keys(definedEntries(write.given))).toEqual(['position']);
    }
    expect(db.transaction).toEqual(['start', 'commit']);
  });

  it('still writes a value that is sent, null included (moves it to the top level)', async () => {
    await updateCategory('c-1', { parent_id: null } as any, {});

    const [categoryWrite] = db.writesTo('category');
    expect(categoryWrite.given).toEqual({ parent_id: null });
  });
});

describe('REST update payload schemas (#1103)', () => {
  // `[auth]payloadValidate` compiles a route's payload schema with getAjv() and
  // validates request.body in place, before the service sees it.
  it.each([
    ['updateProduct', updateProductPayloadSchema, { price: '12.00' }],
    ['updateCategory', updateCategoryPayloadSchema, { position: '3' }],
    ['updateCollection', updateCollectionPayloadSchema, { name: 'Summer' }]
  ])('%s adds nothing to a one-field body', (_route, schema, body) => {
    const payload = { ...body };
    expect(getAjv().compile(schema)(payload)).toBe(true);
    expect(payload).toEqual(body);
  });
});
