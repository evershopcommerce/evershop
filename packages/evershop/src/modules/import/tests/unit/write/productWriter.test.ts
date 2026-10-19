import { describe, it, expect } from '@jest/globals';
import { ImageError } from '../../../services/images/types.js';
import {
  PRODUCT_STORE,
  PRODUCT_STORE_WITH_TEE,
  productFile,
  productRow
} from '../../../services/rules/productFiles.js';
import { csvLine } from '../../../services/report/csvWrite.js';
import { importProducts } from '../helpers/runImport.js';
import {
  METAFIELD_DEFINITIONS,
  METAFIELD_STORE,
  METAFIELD_STORE_NEW
} from '../../../services/rules/metafieldFiles.js';

/**
 * The products writer: what it asks of the services, in what order, and what
 * becomes of a row that fails. The services are the in-memory ones; the real
 * ones are held to the same contract (entityServicesContract.test.ts).
 */
const results = (run: { outcomes: { key: string; result: string }[] }) =>
  run.outcomes.map((outcome) => `${outcome.key}:${outcome.result}`);

const dbError = (code: string, message = 'database says no') =>
  Object.assign(new Error(message), { code });

const member = (
  sku: string,
  color: string,
  size: string,
  extra: Parameters<typeof productRow>[0] = {}
) =>
  productRow({
    sku,
    url_key: sku.toLowerCase(),
    variant_group: 'tee',
    variant_axes: 'color|size',
    'attr:color': color,
    'attr:size': size,
    ...extra
  });

const calls = (run: {
  services: { calls: Array<{ method: string; uuid?: string }> };
}) => run.services.calls.map((call) => call.method);

const STORE = {
  ...PRODUCT_STORE,
  packages: [{ name: 'Standard Box', isDefault: true }, { name: 'Pallet' }]
};

describe('writeProducts: a simple product', () => {
  it('creates it with the ids of the store and the values in the form the service wants', async () => {
    const run = await importProducts(
      productFile(
        productRow({
          images: 'https://example.com/tee.jpg|https://example.com/a.jpg',
          description: 'Our everyday tee.'
        })
      ),
      { store: STORE }
    );
    expect(results(run)).toEqual(['TSH-1:created']);
    expect(calls(run)).toEqual(['createProduct']);
    const [call] = run.services.calls;
    expect(call.input).toMatchObject({
      sku: 'TSH-1',
      name: 'Classic Tee',
      url_key: 'classic-tee',
      // numbers and flags in the form of §4.1
      status: 1,
      visibility: 1,
      price: '24.00',
      qty: '40',
      weight: '0.25',
      manage_stock: 1,
      stock_availability: 1,
      no_shipping_required: 0,
      // ids as strings of digits
      group_id: '1',
      package_id: '1',
      tax_class: '1',
      category_id: '1',
      short_description: 'Organic cotton crew-neck tee.',
      meta_title: 'Classic Tee'
    });
    expect(typeof (call.input as { price: unknown }).price).toBe('string');
    expect(
      (call.input as { no_shipping_required: unknown }).no_shipping_required
    ).toBe(0);
    // the attributes carry the ids of the options, not their texts
    expect(call.input.attributes).toEqual([
      {
        attribute_code: 'color',
        value: String(run.lookup.optionId('color', 'Black'))
      },
      {
        attribute_code: 'size',
        value: String(run.lookup.optionId('size', 'S'))
      }
    ]);
    // the images are the stored paths, in the order of the cell
    expect(call.input.images).toEqual(
      run.images.fetched.map((url) =>
        expect.stringContaining('/assets/catalog/')
      )
    );
    expect(run.images.fetched).toEqual([
      'https://example.com/tee.jpg',
      'https://example.com/a.jpg'
    ]);
    expect(Array.isArray(call.input.description)).toBe(true);
  });

  it('makes the url_key from the name when the cell is blank', async () => {
    const run = await importProducts(
      productFile(productRow({ url_key: '', name: 'Classic Tee & Co' })),
      { store: STORE }
    );
    expect(run.services.calls[0].input.url_key).toBe('classic-tee-co');
  });

  it('uses the default package for a shipped product that gives none', async () => {
    const run = await importProducts(productFile(productRow({ package: '' })), {
      store: STORE
    });
    expect(run.services.calls[0].input.package_id).toBe('1');
  });

  it('sends a package and no weight for a virtual product', async () => {
    const run = await importProducts(
      productFile(
        productRow({ no_shipping_required: '1', package: '', weight: '' })
      ),
      { store: STORE }
    );
    const { input } = run.services.calls[0];
    expect(input.no_shipping_required).toBe(1);
    expect('package_id' in input).toBe(false);
    expect('weight' in input).toBe(false);
  });

  it('fetches the images before it writes, and a bad image fails the row alone', async () => {
    const run = await importProducts(
      productFile(
        productRow({ images: 'https://example.com/gone.jpg' }),
        productRow({ sku: 'TSH-2', url_key: 'tsh-2' })
      ),
      {
        store: STORE,
        prepare: ({ images }) =>
          images.fails(
            'https://example.com/gone.jpg',
            new ImageError('http_status', { status: 404 })
          )
      }
    );
    expect(results(run)).toEqual(['TSH-1:failed', 'TSH-2:created']);
    expect(run.outcomes[0].issues[0]).toMatchObject({
      code: 'IMAGE_UNREADABLE',
      rowNumber: 2,
      column: 'images'
    });
    // nothing was asked of the service for the first row
    expect(run.services.calls.map((c) => c.input.sku)).toEqual(['TSH-2']);
  });

  it('sends the images of an update as a set, and nothing for a blank cell', async () => {
    const withImages = await importProducts(
      productFile(
        productRow({
          images: 'https://example.com/a.jpg',
          name: '',
          price: '',
          qty: '',
          attribute_group: '',
          manage_stock: '',
          stock_availability: '',
          status: '',
          visibility: '',
          'attr:color': '',
          'attr:size': ''
        })
      ),
      { store: PRODUCT_STORE_WITH_TEE }
    );
    expect(withImages.services.calls[0].method).toBe('updateProduct');
    expect(withImages.services.calls[0].input.images).toHaveLength(1);
  });
});

describe('writeProducts: an update', () => {
  const only = (values: Parameters<typeof productRow>[0]) =>
    productFile(
      productRow({
        name: '',
        url_key: '',
        status: '',
        visibility: '',
        price: '',
        qty: '',
        attribute_group: '',
        package: '',
        no_shipping_required: '',
        manage_stock: '',
        stock_availability: '',
        weight: '',
        tax_class: '',
        category: '',
        short_description: '',
        description: '',
        meta_title: '',
        meta_description: '',
        images: '',
        redirect_from: '',
        'attr:color': '',
        'attr:size': '',
        ...values
      })
    );

  it('sends only the cells that were given, by the uuid of the product', async () => {
    const run = await importProducts(only({ price: '30' }), {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(results(run)).toEqual(['TSH-1:updated']);
    expect(run.services.calls).toMatchObject([
      { method: 'updateProduct', uuid: 'uuid-TSH-1', input: { price: '30' } }
    ]);
    expect(Object.keys(run.services.calls[0].input)).toEqual(['price']);
  });

  it('does not call the service when there is nothing to send', async () => {
    const run = await importProducts(only({}), {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(results(run)).toEqual(['TSH-1:updated']);
    expect(run.services.calls).toEqual([]);
  });

  it('sends the url_key only when it changes', async () => {
    const same = await importProducts(only({ url_key: 'classic-tee' }), {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(same.services.calls).toEqual([]);
    const changed = await importProducts(only({ url_key: 'new-key' }), {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(changed.services.calls[0].input.url_key).toBe('new-key');
  });

  it('sends the category only when it changes', async () => {
    const run = await importProducts(only({ category: 'T-Shirts' }), {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(run.services.calls).toEqual([]);
  });

  it('gives a shipped product that has no package the default one (core refuses the save without)', async () => {
    const run = await importProducts(only({ price: '30' }), {
      store: {
        ...PRODUCT_STORE,
        products: [
          { sku: 'TSH-1', urlKey: 'classic-tee', attributeGroup: 'Default' }
        ]
      }
    });
    expect(run.services.calls[0].input).toMatchObject({
      price: '30',
      package_id: '1'
    });
  });

  it('leaves the package of a virtual product alone', async () => {
    const run = await importProducts(only({ price: '30' }), {
      store: {
        ...PRODUCT_STORE,
        products: [
          {
            sku: 'TSH-1',
            urlKey: 'classic-tee',
            attributeGroup: 'Default',
            noShippingRequired: true
          }
        ]
      }
    });
    expect('package_id' in run.services.calls[0].input).toBe(false);
  });

  it('turns the values of the attributes into option ids', async () => {
    const run = await importProducts(only({ 'attr:color': 'white' }), {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(run.services.calls[0].input.attributes).toEqual([
      {
        attribute_code: 'color',
        value: String(run.lookup.optionId('color', 'White'))
      }
    ]);
  });

  it('a multiselect takes the ids of all its options, and a text attribute its text', async () => {
    const store = {
      ...PRODUCT_STORE_WITH_TEE,
      attributeGroups: [
        { name: 'Default', attributes: ['color', 'size', 'note'] }
      ],
      attributes: [
        {
          code: 'color',
          type: 'multiselect' as const,
          options: ['Black', 'White']
        },
        { code: 'size', type: 'text' as const },
        { code: 'note', type: 'text' as const }
      ]
    };
    const run = await importProducts(
      only({ 'attr:color': 'Black|White', 'attr:size': ' Made to measure ' }),
      { store }
    );
    expect(run.services.calls[0].input.attributes).toEqual([
      {
        attribute_code: 'color',
        value: [
          String(run.lookup.optionId('color', 'Black')),
          String(run.lookup.optionId('color', 'White'))
        ]
      },
      { attribute_code: 'size', value: 'Made to measure' }
    ]);
  });
});

describe('writeProducts: the modes and a resumed job', () => {
  it('create refuses a product that exists, update one that does not', async () => {
    const file = productFile(productRow());
    const create = await importProducts(file, {
      mode: 'create',
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(results(create)).toEqual(['TSH-1:failed']);
    expect(create.outcomes[0].issues[0].code).toBe('ALREADY_EXISTS');
    expect(create.services.calls).toEqual([]);
    const update = await importProducts(file, { mode: 'update', store: STORE });
    expect(update.outcomes[0].issues[0].code).toBe('NOT_FOUND');
  });

  it('a resumed create updates what the dead worker wrote (IMP-07)', async () => {
    const run = await importProducts(productFile(productRow()), {
      mode: 'create',
      resumed: true,
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(results(run)).toEqual(['TSH-1:updated']);
  });

  it('writes only the units it is asked for, numbered as in the whole file', async () => {
    const run = await importProducts(
      productFile(
        productRow({ sku: 'A', url_key: 'a' }),
        productRow({ sku: 'B', url_key: 'b' }),
        productRow({ sku: 'C', url_key: 'c' })
      ),
      {
        store: STORE,
        resumed: true,
        include: ({ unit, rowNumber }) => unit > 2 || rowNumber === 2
      }
    );
    expect(run.outcomes.map((o) => [o.key, o.unit])).toEqual([
      ['A', 1],
      ['C', 3]
    ]);
  });
});

describe('writeProducts: failures', () => {
  it('retries a transient failure after 1, 3 and 9 seconds, and counts the retries', async () => {
    const run = await importProducts(productFile(productRow()), {
      store: STORE,
      prepare: ({ services }) =>
        services.failOn(
          (call) => call.method === 'createProduct',
          () => dbError('40001'),
          2
        )
    });
    expect(results(run)).toEqual(['TSH-1:created']);
    expect(run.outcomes[0].retries).toBe(2);
    expect(run.clock.sleeps).toEqual([1000, 3000]);
  });

  it('fails the row after the third retry, and the next row goes on', async () => {
    const run = await importProducts(
      productFile(productRow(), productRow({ sku: 'TSH-2', url_key: 'tsh-2' })),
      {
        store: STORE,
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.input.sku === 'TSH-1',
            () => dbError('40P01', 'deadlock detected')
          )
      }
    );
    expect(results(run)).toEqual(['TSH-1:failed', 'TSH-2:created']);
    expect(run.outcomes[0].retries).toBe(3);
    expect(run.outcomes[0].issues[0]).toMatchObject({ code: 'WRITE_FAILED' });
  });

  it('does not retry a failure that is not transient', async () => {
    const run = await importProducts(productFile(productRow()), {
      store: STORE,
      prepare: ({ services }) =>
        services.failOn(
          () => true,
          () => dbError('23502', 'null value')
        )
    });
    expect(run.outcomes[0].retries).toBe(0);
    expect(run.services.calls).toHaveLength(1);
  });

  it('names the sku or the url_key when the database says one is taken', async () => {
    const taken = await importProducts(
      productFile(productRow({ sku: 'NEW-1' })),
      {
        store: {
          ...STORE,
          products: [
            { sku: 'OTHER', urlKey: 'classic-tee', attributeGroup: 'Default' }
          ]
        }
      }
    );
    // The key is taken: the check would have said so; the service says it again.
    expect(taken.outcomes[0].issues[0]).toMatchObject({
      code: 'CONFLICT',
      column: 'url_key'
    });
    const sku = await importProducts(productFile(productRow()), {
      store: STORE,
      prepare: ({ services }) =>
        services.failOn(
          () => true,
          new Error('This SKU is already used by another product')
        )
    });
    expect(sku.outcomes[0].issues[0]).toMatchObject({
      code: 'CONFLICT',
      column: 'sku'
    });
  });

  it('fails the row when something it refers to is gone since the check', async () => {
    const run = await importProducts(
      productFile(
        productRow({ tax_class: 'Gone' }),
        productRow({ sku: 'TSH-2', url_key: 'tsh-2', 'attr:color': 'Pink' }),
        productRow({ sku: 'TSH-3', url_key: 'tsh-3', category: 'hats' })
      ),
      { store: STORE }
    );
    expect(results(run)).toEqual([
      'TSH-1:failed',
      'TSH-2:failed',
      'TSH-3:failed'
    ]);
    expect(run.outcomes.map((o) => o.issues[0].code)).toEqual([
      'REFERENCE_NOT_FOUND',
      'OPTION_NOT_FOUND',
      'REFERENCE_NOT_FOUND'
    ]);
    expect(run.services.calls).toEqual([]);
  });
});

describe('writeProducts: the old addresses', () => {
  it('writes the redirects after the product is saved', async () => {
    const run = await importProducts(
      productFile(productRow({ redirect_from: '/old/tee|/shop/tee/' })),
      { store: STORE }
    );
    expect(results(run)).toEqual(['TSH-1:created']);
    expect(calls(run)).toEqual(['createProduct', 'recordRedirects']);
    expect(run.services.calls[1]).toMatchObject({
      uuid: run.services.calls[1].uuid,
      input: { fromPaths: ['/old/tee', '/shop/tee/'] }
    });
    expect(
      run.memory.redirects.get(run.services.calls[1].uuid as string)
    ).toEqual(['/old/tee', '/shop/tee/']);
  });

  it('reports a row whose redirects failed as failed, with the product saved (IMP-05), and a re-run completes it', async () => {
    const file = productFile(productRow({ redirect_from: '/old/tee' }));
    const run = await importProducts(file, {
      store: STORE,
      prepare: ({ services }) =>
        services.failOn(
          (call) => call.method === 'recordRedirects',
          new Error('lock timeout')
        )
    });
    expect(results(run)).toEqual(['TSH-1:failed']);
    expect(run.outcomes[0].issues[0]).toMatchObject({
      code: 'WRITE_FAILED',
      rowNumber: 2
    });
    expect(run.outcomes[0].issues[0].message).toContain('redirects');
    expect(run.lookup.products_.has('TSH-1')).toBe(true);

    // The same file again, on the store as it is now: the product is updated and the
    // redirects are written.
    run.services.clearFailures();
    const again = await importProducts(file, {
      store: {
        ...STORE,
        products: [
          {
            sku: 'TSH-1',
            urlKey: 'classic-tee',
            attributeGroup: 'Default',
            package: 'Standard Box'
          }
        ]
      }
    });
    expect(results(again)).toEqual(['TSH-1:updated']);
    expect(calls(again)).toContain('recordRedirects');
  });

  it('writes no redirects for a row without old addresses', async () => {
    const run = await importProducts(productFile(productRow()), {
      store: STORE
    });
    expect(calls(run)).toEqual(['createProduct']);
  });
});

describe('writeProducts: a variant group', () => {
  const tees = (...skus: Array<[string, string, string]>) =>
    productFile(...skus.map(([sku, color, size]) => member(sku, color, size)));

  it('makes the group with the first member, and joins every member, in order', async () => {
    const run = await importProducts(
      tees(
        ['TSH-1', 'Black', 'S'],
        ['TSH-2', 'White', 'S'],
        ['TSH-3', 'Black', 'M']
      ),
      { store: STORE }
    );
    expect(results(run)).toEqual([
      'TSH-1:created',
      'TSH-2:created',
      'TSH-3:created'
    ]);
    expect(calls(run)).toEqual([
      'createProduct',
      'createVariantGroup',
      'addVariantItem',
      'createProduct',
      'addVariantItem',
      'createProduct',
      'addVariantItem'
    ]);
    expect(run.services.calls[1].input).toEqual({
      attributeGroupId: 1,
      axisCodes: ['color', 'size']
    });
    // every join names the one group
    const groupUuids = run.services.calls
      .filter((c) => c.method === 'addVariantItem')
      .map((c) => c.input.groupUuid);
    expect(new Set(groupUuids).size).toBe(1);
    expect(
      [...run.lookup.products_.values()].map((p) => p.variantGroupId)
    ).toEqual([1, 1, 1]);
  });

  it('numbers a group as one unit, and says which outcome ends it', async () => {
    const run = await importProducts(
      productFile(
        member('TSH-1', 'Black', 'S'),
        member('TSH-2', 'White', 'S'),
        productRow({ sku: 'MUG-1', url_key: 'mug-1' }),
        member('HOD-1', 'Black', 'S', { variant_group: 'hoodie' })
      ),
      { store: STORE }
    );
    expect(run.outcomes.map((o) => [o.key, o.unit, o.unitDone])).toEqual([
      ['TSH-1', 1, false],
      ['TSH-2', 1, true],
      ['MUG-1', 2, true],
      ['HOD-1', 3, true]
    ]);
  });

  it('skips the rest of a new group when its first member fails', async () => {
    const run = await importProducts(
      tees(
        ['TSH-1', 'Black', 'S'],
        ['TSH-2', 'White', 'S'],
        ['TSH-3', 'Black', 'M']
      ),
      {
        store: STORE,
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.input.sku === 'TSH-1',
            new Error('boom')
          )
      }
    );
    expect(results(run)).toEqual([
      'TSH-1:failed',
      'TSH-2:skipped',
      'TSH-3:skipped'
    ]);
    expect(run.outcomes[1].issues[0]).toMatchObject({
      code: 'DEPENDENCY_FAILED',
      column: 'variant_group'
    });
    expect(calls(run)).toEqual(['createProduct']);
  });

  it('skips the rest when the group cannot be made, and says the first member is saved but not joined', async () => {
    const run = await importProducts(
      tees(['TSH-1', 'Black', 'S'], ['TSH-2', 'White', 'S']),
      {
        store: STORE,
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.method === 'createVariantGroup',
            new Error('no group today')
          )
      }
    );
    expect(results(run)).toEqual(['TSH-1:failed', 'TSH-2:skipped']);
    expect(run.outcomes[0].issues[0].message).toContain('variant group');
    expect(run.lookup.products_.has('TSH-1')).toBe(true);
  });

  it('a later member that fails fails alone, and the ones joined stay joined', async () => {
    const run = await importProducts(
      tees(
        ['TSH-1', 'Black', 'S'],
        ['TSH-2', 'White', 'S'],
        ['TSH-3', 'Black', 'M']
      ),
      {
        store: STORE,
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.input.sku === 'TSH-2',
            new Error('boom')
          )
      }
    );
    expect(results(run)).toEqual([
      'TSH-1:created',
      'TSH-2:failed',
      'TSH-3:created'
    ]);
    expect(run.lookup.products_.get('TSH-1')?.variantGroupId).toBe(1);
    expect(run.lookup.products_.get('TSH-3')?.variantGroupId).toBe(1);
    expect(run.lookup.products_.has('TSH-2')).toBe(false);
  });

  it('reuses the stored group: no new group, and a new member joins', async () => {
    const store = {
      ...STORE,
      variantGroups: [
        { label: 'g1', attributeGroup: 'Default', axes: ['color', 'size'] }
      ],
      products: [
        {
          sku: 'TSH-1',
          urlKey: 'tsh-1',
          attributeGroup: 'Default',
          package: 'Standard Box',
          variantGroup: 'g1',
          values: { color: 'Black', size: 'S' }
        }
      ]
    };
    const run = await importProducts(
      tees(['TSH-1', 'Black', 'S'], ['TSH-9', 'White', 'M']),
      { store }
    );
    expect(results(run)).toEqual(['TSH-1:updated', 'TSH-9:created']);
    // TSH-1 is in the group already: only the new member is joined
    expect(
      run.services.calls
        .filter((c) => c.method === 'addVariantItem')
        .map((c) => c.uuid)
    ).toEqual([run.lookup.products_.get('TSH-9')?.uuid]);
    expect(calls(run)).not.toContain('createVariantGroup');
  });

  it('a member that was left out on a resume is joined to the group that exists', async () => {
    const store = {
      ...STORE,
      variantGroups: [
        { label: 'g1', attributeGroup: 'Default', axes: ['color', 'size'] }
      ],
      products: [
        {
          sku: 'TSH-1',
          urlKey: 'tsh-1',
          attributeGroup: 'Default',
          package: 'Standard Box',
          variantGroup: 'g1',
          values: { color: 'Black', size: 'S' }
        }
      ]
    };
    const run = await importProducts(
      tees(['TSH-1', 'Black', 'S'], ['TSH-2', 'White', 'S']),
      {
        store,
        resumed: true,
        // only the second row failed on the first run
        include: ({ rowNumber }) => rowNumber === 3
      }
    );
    expect(results(run)).toEqual(['TSH-2:created']);
    expect(calls(run)).toEqual(['createProduct', 'addVariantItem']);
  });

  it('refuses a member that is in a different group than the others now', async () => {
    const store = {
      ...STORE,
      variantGroups: [
        { label: 'g1', attributeGroup: 'Default', axes: ['color', 'size'] },
        { label: 'g2', attributeGroup: 'Default', axes: ['color', 'size'] }
      ],
      products: [
        {
          sku: 'TSH-1',
          urlKey: 'tsh-1',
          attributeGroup: 'Default',
          package: 'Standard Box',
          variantGroup: 'g1'
        },
        {
          sku: 'TSH-2',
          urlKey: 'tsh-2',
          attributeGroup: 'Default',
          package: 'Standard Box',
          variantGroup: 'g2'
        }
      ]
    };
    const run = await importProducts(
      tees(['TSH-1', 'Black', 'S'], ['TSH-2', 'White', 'S']),
      { store }
    );
    expect(results(run)).toEqual(['TSH-1:failed', 'TSH-2:failed']);
    expect(run.outcomes[0].issues[0].code).toBe('VARIANT_CONFLICT');
    expect(run.services.calls).toEqual([]);
  });

  it('a group that is cut between two batches is still one unit', async () => {
    const run = await importProducts(
      tees(
        ['TSH-1', 'Black', 'S'],
        ['TSH-2', 'White', 'S'],
        ['TSH-3', 'Black', 'M']
      ),
      { store: STORE, batchSize: 1 }
    );
    expect(results(run)).toEqual([
      'TSH-1:created',
      'TSH-2:created',
      'TSH-3:created'
    ]);
    expect(run.outcomes.map((o) => o.unit)).toEqual([1, 1, 1]);
    expect(calls(run).filter((m) => m === 'createVariantGroup')).toHaveLength(
      1
    );
  });
});

describe('writeProducts: the questions to the store', () => {
  it('asks once for each batch of rows, never cutting a group', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) =>
      productRow({ sku: `P-${i}`, url_key: `p-${i}` })
    );
    const run = await importProducts(productFile(...rows), {
      store: STORE,
      batchSize: 1000
    });
    expect(run.outcomes.filter((o) => o.result === 'created')).toHaveLength(
      2500
    );
    // the write phase: three batches, each asks for its products once
    expect(run.lookup.calls.products).toBe(3);
    expect(run.lookup.calls.attributeGroups).toBe(1);
    expect(run.lookup.calls.packages).toBe(1);
    // the header check (one) and the first batch (one): not once per batch
    expect(run.lookup.calls.attributes).toBe(2);
  });

  it('stops between two rows of a group when the signal is aborted, and the unit is not done', async () => {
    const controller = new AbortController();
    const run = await importProducts(
      productFile(
        member('TSH-1', 'Black', 'S'),
        member('TSH-2', 'White', 'S'),
        member('TSH-3', 'Black', 'M')
      ),
      {
        store: STORE,
        signal: controller.signal,
        stopAfter: 1
      }
    );
    expect(run.outcomes.map((o) => [o.key, o.unitDone])).toEqual([
      ['TSH-1', false]
    ]);
  });
});

describe('writeProducts: more of the same', () => {
  it('writes the first row of a sku and leaves the repeats', async () => {
    const run = await importProducts(
      productFile(
        productRow({ name: 'First' }),
        productRow({ name: 'Second' })
      ),
      { store: STORE }
    );
    expect(results(run)).toEqual(['TSH-1:created']);
    expect(run.services.calls.map((c) => c.input.name)).toEqual(['First']);
  });

  it('a first member that fails does not skip the others when the group exists', async () => {
    const store = {
      ...STORE,
      variantGroups: [
        { label: 'g1', attributeGroup: 'Default', axes: ['color', 'size'] }
      ],
      products: [
        {
          sku: 'TSH-1',
          urlKey: 'tsh-1',
          attributeGroup: 'Default',
          package: 'Standard Box',
          variantGroup: 'g1',
          values: { color: 'Black', size: 'S' }
        }
      ]
    };
    const run = await importProducts(
      productFile(
        member('TSH-8', 'White', 'M'),
        member('TSH-9', 'White', 'L'),
        member('TSH-1', 'Black', 'S')
      ),
      {
        store,
        prepare: ({ services }) =>
          services.failOn(
            (call) => call.input.sku === 'TSH-8',
            new Error('boom')
          )
      }
    );
    expect(results(run)).toEqual([
      'TSH-8:failed',
      'TSH-9:created',
      'TSH-1:updated'
    ]);
  });

  it('retries an image that fails for a reason that may pass, and not one that will not', async () => {
    const transient = await importProducts(
      productFile(productRow({ images: 'https://example.com/slow.jpg' })),
      {
        store: STORE,
        prepare: ({ images }) =>
          images.fails(
            'https://example.com/slow.jpg',
            new ImageError('http_status', { status: 503 })
          )
      }
    );
    expect(results(transient)).toEqual(['TSH-1:failed']);
    expect(transient.outcomes[0].retries).toBe(3);
    expect(transient.clock.sleeps).toEqual([1000, 3000, 9000]);
    const gone = await importProducts(
      productFile(productRow({ images: 'https://example.com/gone.jpg' })),
      {
        store: STORE,
        prepare: ({ images }) =>
          images.fails(
            'https://example.com/gone.jpg',
            new ImageError('http_status', { status: 404 })
          )
      }
    );
    expect(gone.outcomes[0].retries).toBe(0);
    expect(gone.clock.sleeps).toEqual([]);
  });

  it('fails the row when a name is no longer unique in the store', async () => {
    const run = await importProducts(productFile(productRow()), {
      store: {
        ...STORE,
        taxClasses: [{ name: 'Taxable Goods' }, { name: 'taxable goods' }]
      }
    });
    expect(results(run)).toEqual(['TSH-1:failed']);
    expect(run.outcomes[0].issues[0]).toMatchObject({
      code: 'REFERENCE_AMBIGUOUS',
      column: 'tax_class'
    });
    expect(run.services.calls).toEqual([]);
  });

  it('asks for the options of an attribute once, however many batches there are', async () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      productRow({ sku: `P-${i}`, url_key: `p-${i}` })
    );
    const run = await importProducts(productFile(...rows), {
      store: STORE,
      batchSize: 10
    });
    expect(run.outcomes.filter((o) => o.result === 'created')).toHaveLength(30);
    // color and size, each with one text: two questions in all
    expect(run.lookup.calls.attributeOptions).toBe(2);
  });

  it('a multiselect that has a text which is not an option fails the row', async () => {
    const run = await importProducts(
      productFile(productRow({ 'attr:size': 'S|XL' })),
      {
        store: {
          ...STORE,
          attributes: [
            { code: 'color', type: 'select' as const, options: ['Black'] },
            { code: 'size', type: 'multiselect' as const, options: ['S', 'M'] }
          ]
        }
      }
    );
    expect(results(run)).toEqual(['TSH-1:failed']);
    expect(run.outcomes[0].issues[0].code).toBe('OPTION_NOT_FOUND');
  });
});

describe('writeProducts: the custom fields (§ 5.9)', () => {
  const cells = (more: Record<string, string>) => {
    const keys = Object.keys(more);
    return (
      csvLine(['sku', ...keys.map((key) => `metafield:${key}`)]) +
      csvLine(['TSH-1', ...keys.map((key) => more[key])])
    );
  };

  it('sends each cell as a value of its type, in {namespace: {key: value}}', async () => {
    const run = await importProducts(
      cells({
        'custom.material': 'Organic cotton',
        'custom.years': '3',
        'custom.rate': '2.5',
        'custom.eco': 'TRUE',
        'custom.launch': '2026-03-01',
        'custom.care': 'wash|dry',
        'custom.specs': '{"fit":"Relaxed","gsm":180}'
      }),
      { store: METAFIELD_STORE }
    );
    expect(results(run)).toEqual(['TSH-1:updated']);
    expect(run.services.calls[0].method).toBe('updateProduct');
    expect(run.services.calls[0].input.metafields).toEqual({
      custom: {
        material: 'Organic cotton',
        years: 3,
        rate: 2.5,
        eco: true,
        launch: '2026-03-01',
        care: ['wash', 'dry'],
        specs: { fit: 'Relaxed', gsm: 180 }
      }
    });
    expect(run.lookup.products_.get('TSH-1')?.metaData).toEqual(
      run.services.calls[0].input.metafields
    );
  });

  it('lays the cells over the stored set, key by key: the rest is kept, because core replaces the whole set', async () => {
    const store = {
      ...METAFIELD_STORE,
      products: [
        {
          ...METAFIELD_STORE.products![0],
          metaData: {
            custom: { material: 'Wool', years: 5 },
            other: { note: 'kept' }
          }
        }
      ]
    };
    const run = await importProducts(cells({ 'custom.material': 'Cotton' }), {
      store
    });
    expect(run.services.calls[0].input.metafields).toEqual({
      custom: { material: 'Cotton', years: 5 },
      other: { note: 'kept' }
    });
  });

  it('sends nothing about custom fields for an update that has no cell for them', async () => {
    const run = await importProducts('sku,price\nTSH-1,30\n', {
      store: METAFIELD_STORE
    });
    expect('metafields' in run.services.calls[0].input).toBe(false);
  });

  it('a create sends the set, also when it is empty, so that core checks the required ones', async () => {
    const withFields = await importProducts(productFile(productRow()), {
      store: METAFIELD_STORE_NEW()
    });
    expect(withFields.services.calls[0].input.metafields).toEqual({});
    const without = await importProducts(productFile(productRow()), {
      store: STORE
    });
    expect('metafields' in without.services.calls[0].input).toBe(false);
  });

  it('fails the row that has a value the store would refuse, or lacks a required one, and writes nothing', async () => {
    const bad = await importProducts(cells({ 'custom.warranty': '99' }), {
      store: METAFIELD_STORE
    });
    expect(results(bad)).toEqual(['TSH-1:failed']);
    expect(bad.outcomes[0].issues[0]).toMatchObject({
      code: 'METAFIELD_INVALID',
      column: 'metafield:custom.warranty'
    });
    expect(bad.services.calls).toEqual([]);

    const missing = await importProducts(productFile(productRow()), {
      store: METAFIELD_STORE_NEW(['custom.material'])
    });
    expect(results(missing)).toEqual(['TSH-1:failed']);
    expect(missing.outcomes[0].issues[0]).toMatchObject({
      code: 'MISSING_REQUIRED',
      column: 'metafield:custom.material'
    });
    expect(missing.services.calls).toEqual([]);
  });

  it('an update of a product that has a value for a required field does not ask for it again', async () => {
    const run = await importProducts('sku,price\nTSH-1,30\n', {
      store: {
        ...METAFIELD_STORE,
        metafieldDefinitions: METAFIELD_STORE_NEW(['custom.material'])
          .metafieldDefinitions,
        products: [
          {
            ...METAFIELD_STORE.products![0],
            metaData: { custom: { material: 'Cotton' } }
          }
        ]
      }
    });
    expect(results(run)).toEqual(['TSH-1:updated']);
  });

  it('reads a definition once for the whole run', async () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      productRow({ sku: `P-${i}`, url_key: `p-${i}` })
    );
    const run = await importProducts(productFile(...rows), {
      store: METAFIELD_STORE_NEW(),
      batchSize: 10
    });
    expect(run.lookup.calls.metafields).toBe(1);
  });

  it('knows the definitions of the example store', () => {
    expect(METAFIELD_DEFINITIONS.length).toBeGreaterThan(10);
  });
});
