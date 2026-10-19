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
const db = createRecordingBuilder({
  // As the real builder does, the stand-in writes only the columns a table has.
  columns: {
    product: [
      'sku',
      'price',
      'weight',
      'status',
      'visibility',
      'group_id',
      'tax_class',
      'category_id',
      'package_id',
      'no_shipping_required',
      'variant_group_id'
    ],
    product_description: [
      'name',
      'description',
      'short_description',
      'url_key',
      'meta_title',
      'meta_description'
    ],
    product_inventory: ['qty', 'manage_stock', 'stock_availability']
  }
});

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

const {
  default: updateProduct,
  hookBeforeUpdateProductAttributes,
  hookBeforeUpdateProductImages,
  hookBeforeUpdateProductInventory
} = await import('../../services/product/updateProduct.js');
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

describe('updateProduct that changes only the attributes or only the images', () => {
  // With no column of `product` or `product_description` in the payload, the
  // result of the data step had no product_id, and the attribute and image steps
  // were given `undefined` (a not-null violation on a real database).
  const captured: Array<{ step: string; args: unknown[] }> = [];
  // The image step writes with `del`/`insert`, which the recording builder does
  // not allow: the hook stops the update there, once it has seen the arguments.
  let stopAtImages = false;

  hookBeforeUpdateProductAttributes(function attributes(...args) {
    captured.push({ step: 'attributes', args });
  });
  hookBeforeUpdateProductImages(function images(...args) {
    captured.push({ step: 'images', args });
    if (stopAtImages) {
      throw new Error('stopped at the image step');
    }
  });
  hookBeforeUpdateProductInventory(function inventory(...args) {
    captured.push({ step: 'inventory', args });
  });

  beforeEach(() => {
    captured.length = 0;
    stopAtImages = false;
    db.setRows({
      product: { ...storedProduct, variant_group_id: 9 },
      variant_group: {
        attribute_one: 1,
        attribute_two: null,
        attribute_three: null,
        attribute_four: null,
        attribute_five: null
      },
      attribute: []
    });
  });

  it('gives the attribute step the id and the variant group of the product', async () => {
    const attributes = [{ attribute_code: 'color', value: '1' }];
    await updateProduct('p-1', { attributes } as any, {});
    const step = captured.find((c) => c.step === 'attributes');
    expect(step?.args.slice(0, 2)).toEqual([attributes, 1]);
    // the variant group is the third argument (the siblings get the values too)
    expect(step?.args[2]).toBe(9);
  });

  it('gives the image step the id of the product', async () => {
    stopAtImages = true;
    await expect(
      updateProduct('p-1', { images: ['/a.png'] } as any, {})
    ).rejects.toThrow('stopped at the image step');
    expect(captured.find((c) => c.step === 'images')?.args.slice(0, 2)).toEqual(
      [['/a.png'], 1]
    );
  });

  it('gives the inventory step the id of the product', async () => {
    await updateProduct('p-1', { qty: '3' } as any, {});
    expect(captured.find((c) => c.step === 'inventory')?.args[1]).toBe(1);
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
