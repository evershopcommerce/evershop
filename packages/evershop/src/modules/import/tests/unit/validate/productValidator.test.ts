import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { productValidator } from '../../../services/entities/product/productValidator.js';
import type { HeaderInfo } from '../../../services/entities/definition.js';
import type { CsvRow } from '../../../services/reader/readCsv.js';
import {
  PRODUCT_COLUMNS,
  PRODUCT_HEADER,
  PRODUCT_STORE,
  PRODUCT_STORE_WITH_TEE,
  productFile,
  productRow
} from '../../../services/rules/productFiles.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { validateProducts } from '../helpers/runValidation.js';

/**
 * The product file as a whole: the header, the keys, the modes, the counts, the
 * questions asked of the store, and the example file of the specification. What
 * each rule says on its own is in the examples of the rules.
 */
const codes = (issues: Array<{ code: string }>) => issues.map((i) => i.code);

// A store where the sku `A` exists, so that a header test sees header issues only.
const STORE_A = {
  ...PRODUCT_STORE,
  products: [{ sku: 'A', attributeGroup: 'Default', package: 'Standard Box' }]
};

describe('the header of a product file', () => {
  it('needs a sku column, and stops without one', async () => {
    const result = await validateProducts('name,price\nTee,24\n', {
      store: PRODUCT_STORE
    });
    expect(result.issues).toMatchObject([
      { code: 'MISSING_COLUMN', column: 'sku' }
    ]);
    expect(result.summary.stopped).toBe(true);
  });

  it('refuses an attr: column of an attribute that does not exist', async () => {
    const result = await validateProducts(
      'sku,attr:color,attr:Fit\nA,Black,Slim\n',
      { store: STORE_A }
    );
    expect(result.issues).toMatchObject([
      { code: 'REFERENCE_NOT_FOUND', column: 'attr:Fit' }
    ]);
  });

  it('knows an attribute code in any letter case', async () => {
    const result = await validateProducts('sku,attr:COLOR\nA,Black\n', {
      store: STORE_A
    });
    expect(result.issues).toEqual([]);
  });

  it('refuses a metafield: column with no definition, and warns about an unknown column', async () => {
    const result = await validateProducts(
      'sku,metafield:custom.material,metafield:custom.nope,colour\nA,x,y,z\n',
      {
        store: { ...STORE_A, metafields: { product: ['custom.material'] } }
      }
    );
    expect(result.issues).toMatchObject([
      { code: 'REFERENCE_NOT_FOUND', column: 'metafield:custom.nope' },
      { code: 'UNKNOWN_COLUMN', column: 'colour', severity: 'warning' }
    ]);
  });

  it('warns about a column named attr: with no code', async () => {
    const result = await validateProducts('sku,attr:\nA,x\n', {
      store: STORE_A
    });
    expect(result.issues).toMatchObject([
      { code: 'UNKNOWN_COLUMN', column: 'attr:' }
    ]);
  });
});

describe('the keys of a product file', () => {
  it('refuses a row with no sku, and says the sku is the key', async () => {
    const result = await validateProducts(
      productFile(productRow({ sku: '' })),
      { store: PRODUCT_STORE }
    );
    expect(result.issues).toMatchObject([
      { code: 'MISSING_REQUIRED', column: 'sku', rowNumber: 2 }
    ]);
  });

  it('refuses the second row of the same sku, and judges only the first', async () => {
    const result = await validateProducts(
      productFile(productRow(), productRow({ url_key: 'other-key', name: '' })),
      { store: PRODUCT_STORE }
    );
    // Row 3 is only a duplicate: its missing name is not said.
    expect(result.issues).toMatchObject([
      { code: 'DUPLICATE_KEY_IN_FILE', column: 'sku', rowNumber: 3 }
    ]);
  });

  it('matches a sku exactly, letter case included', async () => {
    const result = await validateProducts(
      productFile(productRow({ sku: 'tsh-1' })),
      { store: PRODUCT_STORE_WITH_TEE }
    );
    expect(result.summary).toMatchObject({ createRows: 1, updateRows: 0 });
  });

  it('skips the two example rows of the template with a warning each', async () => {
    const result = await validateProducts(
      productFile(
        productRow({ sku: 'EXAMPLE-SKU-1', name: '' }),
        productRow({ sku: 'EXAMPLE-SKU-2', price: 'x' }),
        productRow()
      ),
      { store: PRODUCT_STORE }
    );
    expect(codes(result.issues)).toEqual([
      'TEMPLATE_EXAMPLE_ROW',
      'TEMPLATE_EXAMPLE_ROW'
    ]);
    expect(result.summary).toMatchObject({
      exampleRows: 2,
      createRows: 1,
      errors: 0,
      warnings: 2
    });
  });
});

describe('the modes', () => {
  it('create refuses a product that exists, update refuses one that does not', async () => {
    const file = productFile(productRow());
    const create = await validateProducts(file, {
      mode: 'create',
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(create.issues).toMatchObject([
      { code: 'ALREADY_EXISTS', column: 'sku', rowNumber: 2 }
    ]);
    const update = await validateProducts(file, {
      mode: 'update',
      store: PRODUCT_STORE
    });
    expect(update.issues).toMatchObject([
      { code: 'NOT_FOUND', column: 'sku', rowNumber: 2 }
    ]);
    // A row that is refused by its mode is not also told what it lacks.
    const bare = await validateProducts(productFile(productRow({ name: '' })), {
      mode: 'update',
      store: PRODUCT_STORE
    });
    expect(codes(bare.issues)).toEqual(['NOT_FOUND']);
  });

  it('upsert counts what creates and what updates', async () => {
    const result = await validateProducts(
      productFile(
        productRow(),
        productRow({ sku: 'TSH-2', url_key: 'classic-tee-2' })
      ),
      { store: PRODUCT_STORE_WITH_TEE }
    );
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({ createRows: 1, updateRows: 1 });
  });

  it('an update file with a sku and one column is valid (PRD-02)', async () => {
    const result = await validateProducts('sku,price\nTSH-1,30\n', {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(result.issues).toEqual([]);
    expect(result.summary.updateRows).toBe(1);
  });
});

describe('a cell that cannot be read', () => {
  it('is said once and is not also said to be missing', async () => {
    const result = await validateProducts(
      productFile(productRow({ price: 'abc', status: 'maybe', qty: '-1' })),
      { store: PRODUCT_STORE }
    );
    expect(result.issues.map((i) => [i.code, i.column]).sort()).toEqual([
      ['INVALID_VALUE', 'price'],
      ['INVALID_VALUE', 'qty'],
      ['INVALID_VALUE', 'status']
    ]);
  });

  it('reads the booleans in any letter case, and 0 and 1 in the cells', async () => {
    const result = await validateProducts(
      productFile(
        productRow({
          status: 'TRUE',
          visibility: 'False',
          manage_stock: '1',
          stock_availability: '0'
        })
      ),
      { store: PRODUCT_STORE }
    );
    expect(result.issues).toEqual([]);
  });
});

describe('the questions asked of the store', () => {
  const manyRows = (n: number) =>
    productFile(
      ...Array.from({ length: n }, (_, i) =>
        productRow({
          sku: `SKU-${i}`,
          url_key: `sku-${i}`,
          redirect_from: `/old/${i}`
        })
      )
    );

  it('asks once for each batch and once for each distinct name', async () => {
    const result = await validateProducts(manyRows(2500), {
      store: PRODUCT_STORE,
      batchSize: 1000
    });
    expect(result.issues).toEqual([]);
    const { calls } = result.lookup;
    // Three batches of rows: one question each...
    expect(calls.products).toBe(3);
    expect(calls.productUrlKeyOwners).toBe(3);
    expect(calls.redirects).toBe(3);
    expect(calls.rewritePaths).toBe(3);
    // ...but a name that every row uses is asked for once for the whole file.
    expect(calls.attributeGroups).toBe(1);
    expect(calls.packages).toBe(1);
    expect(calls.taxClasses).toBe(1);
    expect(calls.categories).toBe(1);
    // The links of the attribute group are asked for once, on the first batch.
    expect(calls.attributeGroupLinks).toBe(1);
  });

  it('asks for the options of an attribute once for each text', async () => {
    const result = await validateProducts(manyRows(2500), {
      store: PRODUCT_STORE,
      batchSize: 1000
    });
    // 'color' and 'size' have one text each in every row: two questions in all,
    // asked in the first batch.
    expect(result.lookup.calls.attributeOptions).toBe(2);
  });
});

describe('the merged record of an update', () => {
  it('judges the attributes against the group the product has when the cell is blank', async () => {
    const result = await validateProducts('sku,attr:size\nTSH-1,M\n', {
      store: {
        ...PRODUCT_STORE_WITH_TEE,
        attributeGroups: [{ name: 'Default', attributes: ['color'] }]
      }
    });
    expect(result.issues).toMatchObject([
      { code: 'ATTRIBUTE_NOT_IN_GROUP', column: 'attr:size' }
    ]);
  });

  it('does not ask for a group it cannot name when the attribute group cell is wrong', async () => {
    const result = await validateProducts(
      productFile(productRow({ attribute_group: 'Nope' })),
      { store: PRODUCT_STORE }
    );
    // One problem: the group. Its attributes are not judged against nothing.
    expect(codes(result.issues)).toEqual(['REFERENCE_NOT_FOUND']);
  });

  it('keeps the stored url_key when the cell is blank on an update', async () => {
    const result = await validateProducts('sku,name,url_key\nTSH-1,日本語,\n', {
      store: PRODUCT_STORE_WITH_TEE
    });
    expect(result.issues).toEqual([]);
  });
});

describe('productValidator.convert', () => {
  const header: HeaderInfo = {
    columns: [...PRODUCT_COLUMNS],
    position: new Map(PRODUCT_COLUMNS.map((name, at) => [name, at]))
  };
  const ctx = {
    lookup: new MemoryLookup(),
    mode: 'upsert' as const,
    now: () => 1_760_000_000_000,
    sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex')
  };
  const cells = (values: Record<string, string>) =>
    PRODUCT_COLUMNS.map((column) => values[column] ?? '');
  const convert = (values: Record<string, string>) =>
    productValidator.convert(
      { rowNumber: 2, cells: cells(values), hasError: false } as CsvRow,
      header,
      ctx
    );

  it('types the cells and leaves a blank cell out', () => {
    const row = convert({
      sku: ' A-1 ',
      name: ' <b>Tee</b> ',
      status: '1',
      visibility: '0',
      price: '007.5',
      qty: '012',
      weight: '1.25',
      attribute_group: ' Default ',
      category: 'T-Shirts',
      no_shipping_required: 'true',
      images: 'https://e.com/a.jpg|https://e.com/b.jpg|',
      redirect_from: '/a|/b|/a',
      variant_axes: 'Color|SIZE',
      'attr:color': ' Black ',
      'attr:size': ''
    });
    expect(row.key).toBe('A-1');
    expect(row.data).toMatchObject({
      sku: 'A-1',
      name: '&lt;b&gt;Tee&lt;/b&gt;',
      status: 1,
      visibility: 0,
      price: '7.5',
      qty: '12',
      weight: '1.25',
      attribute_group: 'Default',
      category: 't-shirts',
      no_shipping_required: 1,
      images: ['https://e.com/a.jpg', 'https://e.com/b.jpg'],
      redirect_from: ['/a', '/b'],
      variant_axes: ['color', 'size'],
      attributes: [{ code: 'color', column: 'attr:color', text: 'Black' }]
    });
    expect('url_key' in row.data).toBe(false);
    expect('package' in row.data).toBe(false);
  });

  it('turns a description into the blocks of the editor', () => {
    const row = convert({ sku: 'A', description: 'One\n\nTwo' });
    expect(row.data.description?.[0].columns[0].data.blocks).toHaveLength(2);
  });

  it('marks a row the reader refused, or of the wrong width, as broken', () => {
    expect(
      productValidator.convert(
        { rowNumber: 2, cells: ['A'], hasError: false } as CsvRow,
        header,
        ctx
      ).broken
    ).toBe(true);
    expect(
      productValidator.convert(
        { rowNumber: 2, cells: cells({ sku: 'A' }), hasError: true } as CsvRow,
        header,
        ctx
      ).broken
    ).toBe(true);
  });
});

describe('the products example file of the specification', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const example = readFileSync(
    path.resolve(here, '../../fixtures/products.csv')
  );
  // What the README of the example files says the store must contain first.
  const NORTHLINE = {
    attributeGroups: [{ name: 'Default', attributes: ['color', 'size'] }],
    packages: [{ name: 'Standard Box', isDefault: true }],
    taxClasses: [{ name: 'Taxable Goods' }],
    attributes: [
      {
        code: 'color',
        type: 'select' as const,
        options: ['Black', 'White', 'Gray', 'Beige', 'Navy']
      },
      { code: 'size', type: 'select' as const, options: ['S', 'M', 'L'] }
    ],
    categories: ['t-shirts', 'hoodies', 'bags', 'accessories'].map(
      (urlKey) => ({
        urlKey
      })
    ),
    metafields: {
      product: [
        'custom.material',
        'custom.eco_certified',
        'custom.launch_date',
        'custom.care_tags',
        'custom.specs',
        'custom.warranty_years'
      ]
    }
  };

  it('has the header of the examples of the rules plus its own columns', () => {
    expect(PRODUCT_HEADER.startsWith('sku,name,url_key,status')).toBe(true);
    expect(example.toString().startsWith('sku,name,url_key,status')).toBe(true);
  });

  it('is valid against that store, and creates its twelve products', async () => {
    const result = await validateProducts(example, { store: NORTHLINE });
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({
      totalRows: 12,
      createRows: 12,
      updateRows: 0,
      errors: 0,
      warnings: 0
    });
  });

  it('is read the same way in chunks of 7 bytes', async () => {
    const result = await validateProducts(example, {
      store: NORTHLINE,
      chunkSize: 7
    });
    expect(result.issues).toEqual([]);
  });

  it('is refused for the attributes when they are required and three products have no size', async () => {
    const result = await validateProducts(example, {
      store: {
        ...NORTHLINE,
        attributes: NORTHLINE.attributes.map((a) => ({ ...a, required: true }))
      }
    });
    // README: the seeded color and size are required, and three example
    // products have no size and one has no color.
    const missing = result.issues
      .filter((i) => i.code === 'MISSING_REQUIRED')
      .map((i) => `${i.rowNumber}:${i.column}`)
      .sort();
    expect(missing.length).toBeGreaterThanOrEqual(4);
    expect(missing).toContain('13:attr:size');
  });
});

describe('variant groups across batches', () => {
  const tee = (sku: string, color: string, size: string) =>
    productRow({
      sku,
      url_key: sku.toLowerCase(),
      variant_group: 'tee',
      variant_axes: 'color|size',
      'attr:color': color,
      'attr:size': size
    });

  it.each([1, 2, 3, 1000])(
    'finds the same problems whether the batches hold %i rows',
    async (batchSize) => {
      const result = await validateProducts(
        productFile(
          tee('A', 'Black', 'S'),
          tee('B', 'White', 'S'),
          tee('C', 'Black', 'M'),
          tee('D', 'Black', 'S'),
          productRow({ sku: 'E', url_key: 'e' }),
          tee('F', 'White', 'L'),
          tee('G', 'White', 'L')
        ),
        { store: PRODUCT_STORE, batchSize }
      );
      expect(result.issues.map((i) => [i.code, i.rowNumber, i.column])).toEqual(
        [
          // D repeats A, and the last group (F, G) is closed at the end of the file
          ['VARIANT_NOT_ADJACENT', 7, 'variant_group'],
          ['VARIANT_DUPLICATE_COMBINATION', 5, 'variant_group'],
          ['VARIANT_DUPLICATE_COMBINATION', 8, 'variant_group']
        ]
      );
    }
  );

  it('says nothing about a clean group, however it is cut', async () => {
    for (const batchSize of [1, 2, 3]) {
      // eslint-disable-next-line no-await-in-loop
      const result = await validateProducts(
        productFile(
          tee('A', 'Black', 'S'),
          tee('B', 'White', 'S'),
          tee('C', 'Black', 'M')
        ),
        { store: PRODUCT_STORE, batchSize }
      );
      expect(result.issues).toEqual([]);
    }
  });
});

describe('the custom fields of a product file (MET-06)', () => {
  const fields = [
    { namespace: 'custom', key: 'years', type: 'integer' as const },
    {
      namespace: 'custom',
      key: 'warranty',
      type: 'integer' as const,
      validations: [{ type: 'range' as const, min: 0, max: 10 }]
    },
    { namespace: 'custom', key: 'eco', type: 'boolean' as const },
    {
      namespace: 'custom',
      key: 'material',
      type: 'short_text' as const,
      required: true
    }
  ];
  const store = {
    ...PRODUCT_STORE_WITH_TEE,
    metafieldDefinitions: { product: fields },
    products: [
      {
        ...PRODUCT_STORE_WITH_TEE.products[0],
        metaData: { custom: { material: 'Cotton' } }
      }
    ]
  };

  it('shows the problem of every column of a row, each with its own column', async () => {
    const result = await validateProducts(
      'sku,metafield:custom.years,metafield:custom.warranty,metafield:custom.eco\nTSH-1,many,99,maybe\n',
      { store }
    );
    expect(result.issues.map((i) => [i.code, i.column, i.rowNumber])).toEqual([
      ['METAFIELD_INVALID', 'metafield:custom.years', 2],
      ['METAFIELD_INVALID', 'metafield:custom.warranty', 2],
      ['METAFIELD_INVALID', 'metafield:custom.eco', 2]
    ]);
  });

  it('keeps the stored value of a required field for an update, and asks a new product for it', async () => {
    const update = await validateProducts('sku,price\nTSH-1,30\n', { store });
    expect(update.issues).toEqual([]);
    const create = await validateProducts(
      productFile(productRow({ sku: 'NEW-1', url_key: 'new-1' })),
      { store }
    );
    expect(create.issues.map((i) => [i.code, i.column])).toEqual([
      ['MISSING_REQUIRED', 'metafield:custom.material']
    ]);
  });

  it('does not ask a row that its mode refuses', async () => {
    const result = await validateProducts(
      productFile(productRow({ sku: 'NEW-1', url_key: 'new-1' })),
      { store, mode: 'update' }
    );
    expect(result.issues.map((i) => i.code)).toEqual(['NOT_FOUND']);
  });

  it('asks the store for the definitions once for the whole file', async () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      productRow({ sku: `P-${i}`, url_key: `p-${i}` })
    );
    const result = await validateProducts(productFile(...rows), {
      store: {
        ...PRODUCT_STORE,
        metafieldDefinitions: { product: [{ ...fields[0] }] }
      },
      batchSize: 10
    });
    expect(result.lookup.calls.metafields).toBe(1);
  });
});
