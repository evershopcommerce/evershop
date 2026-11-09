import {
  PRODUCT_STORE,
  PRODUCT_STORE_WITH_TEE,
  productFile,
  productRow
} from './productFiles.js';
import { defineRule } from './rule.js';
import type { ExampleRuleDefinition, RuleExample } from './rule.js';

/**
 * The rules of the product file (§ 7.4, `PRD`) and the rule it shares with
 * categories (`IMG-02`). Each is shown on a valid file with one cell changed.
 *
 * Not here yet: the variant rules (PRD-13 to PRD-19, PRD-24) and the custom
 * fields (`MET`).
 */
// A product example runs against the store of the examples unless it brings its own.
const withStore = (examples: RuleExample[]): RuleExample[] =>
  examples.map((example) => ({ store: PRODUCT_STORE, ...example }));

const defineProductRule = (definition: ExampleRuleDefinition) =>
  defineRule({
    ...definition,
    examples: {
      pass: withStore(definition.examples.pass),
      fail: withStore(definition.examples.fail)
    }
  });

const file = (values: Parameters<typeof productRow>[0] = {}) =>
  productFile(productRow(values));

const row2 = (column: string, code: string = 'INVALID_VALUE') => ({
  code: code as never,
  rowNumber: 2,
  column
});

/** An update that sends the key and nothing else: every other cell is blank. */
const KEY_ONLY = {
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
  'attr:size': ''
};

export const PRD_01 = defineProductRule({
  id: 'PRD-01',
  entity: 'product',
  layer: 'S',
  source: 'core+engine',
  op: 'C',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'Create requires name, status, visibility, price, qty and attribute_group (core), and manage_stock and stock_availability (engine: their database default is false, so a product without them would be unmanaged and out of stock). A blank url_key is derived (PRD-28).',
  examples: {
    pass: [
      {
        name: 'an update needs nothing but the key',
        store: PRODUCT_STORE_WITH_TEE,
        file: file({ ...KEY_ONLY, price: '30' }),
        expect: []
      }
    ],
    fail: [
      ...(
        [
          'name',
          'status',
          'visibility',
          'price',
          'qty',
          'attribute_group',
          'manage_stock',
          'stock_availability'
        ] as const
      ).map((column) => ({
        name: `a new product without ${column}`,
        file: file({ [column]: '' }),
        expect: [row2(column, 'MISSING_REQUIRED')]
      })),
      {
        name: 'several at once (all are said, in column order)',
        file: file({ name: '', price: '', qty: '' }),
        expect: [
          row2('name', 'MISSING_REQUIRED'),
          row2('price', 'MISSING_REQUIRED'),
          row2('qty', 'MISSING_REQUIRED')
        ]
      }
    ]
  }
});

export const PRD_02 = defineRule({
  id: 'PRD-02',
  entity: 'product',
  layer: 'S',
  source: 'core',
  op: 'U',
  code: 'MISSING_REQUIRED',
  testedBy: 'runner',
  test: 'tests/unit/validate/productValidator.test.ts',
  summary:
    'Update requires nothing but the key: a row with a sku and one changed column is valid.'
});

export const PRD_03 = defineProductRule({
  id: 'PRD-03',
  entity: 'product',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'url_key: lowercase letters, digits and single hyphens; 1 to 255 characters.',
  examples: {
    pass: [
      {
        name: 'letters, digits and hyphens',
        file: file({ url_key: 'classic-tee-2' }),
        expect: []
      },
      {
        name: 'exactly 255 characters',
        file: file({ url_key: 'a'.repeat(255) }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a space and a capital',
        file: file({ url_key: 'Classic Tee' }),
        expect: [row2('url_key')]
      },
      {
        name: 'a double hyphen',
        file: file({ url_key: 'classic--tee' }),
        expect: [row2('url_key')]
      },
      {
        name: 'a hyphen at the end',
        file: file({ url_key: 'classic-tee-' }),
        expect: [row2('url_key')]
      },
      {
        name: '256 characters',
        file: file({ url_key: 'a'.repeat(256) }),
        expect: [row2('url_key')]
      }
    ]
  }
});

export const PRD_04 = defineProductRule({
  id: 'PRD-04',
  entity: 'product',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'price: a number of at least 0 with at most 2 decimals (24, 24.5 and 0 pass; -1, 24.999, 1,200.00 and .5 fail).',
  examples: {
    pass: [
      ...['24', '24.5', '0', '0.99', '99999999.99'].map((price) => ({
        name: price,
        file: file({ price }),
        expect: []
      }))
    ],
    fail: [
      ...['-1', '24.999', '1,200.00', '.5', 'abc', '24.'].map((price) => ({
        name: price,
        file: file({ price }),
        expect: [row2('price')]
      }))
    ]
  }
});

export const PRD_05 = defineProductRule({
  id: 'PRD-05',
  entity: 'product',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'weight: the same pattern as price.',
  examples: {
    pass: [
      ...['0', '1.5', '12.25'].map((weight) => ({
        name: weight,
        file: file({ weight }),
        expect: []
      }))
    ],
    fail: [
      ...['-1', '1.234', '1kg'].map((weight) => ({
        name: weight,
        file: file({ weight }),
        expect: [row2('weight')]
      }))
    ]
  }
});

export const PRD_06 = defineProductRule({
  id: 'PRD-06',
  entity: 'product',
  layer: 'S',
  source: 'core',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary: 'qty: a whole number of at least 0.',
  examples: {
    pass: [
      ...['0', '40', '2147483647'].map((qty) => ({
        name: qty,
        file: file({ qty }),
        expect: []
      }))
    ],
    fail: [
      ...['-1', '1.5', 'many', '1,000'].map((qty) => ({
        name: qty,
        file: file({ qty }),
        expect: [row2('qty')]
      }))
    ]
  }
});

const NO_DEFAULT_PACKAGE = {
  ...PRODUCT_STORE,
  packages: [{ name: 'Standard Box' }]
};

export const PRD_07 = defineProductRule({
  id: 'PRD-07',
  entity: 'product',
  layer: 'S',
  source: 'core+engine',
  op: 'B',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'A shippable product has a package: the package cell, else the stored one, else the default package of the store (D-25). A store with no default package refuses the row.',
  examples: {
    pass: [
      {
        name: 'a blank package: the default package is used',
        file: file({ package: '' }),
        expect: []
      },
      {
        name: 'a virtual product needs none',
        store: NO_DEFAULT_PACKAGE,
        file: file({ no_shipping_required: '1', package: '', weight: '' }),
        expect: []
      },
      {
        name: 'an update keeps the stored package',
        store: {
          ...NO_DEFAULT_PACKAGE,
          products: PRODUCT_STORE_WITH_TEE.products
        },
        file: file({ ...KEY_ONLY, price: '30' }),
        expect: []
      },
      {
        name: 'a package is written',
        store: NO_DEFAULT_PACKAGE,
        file: file(),
        expect: []
      },
      {
        name: 'an update of a virtual product keeps it virtual: no package is needed',
        store: {
          ...NO_DEFAULT_PACKAGE,
          products: [
            {
              sku: 'TSH-1',
              urlKey: 'classic-tee',
              attributeGroup: 'Default',
              noShippingRequired: true
            }
          ]
        },
        file: file({ ...KEY_ONLY, price: '30' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a new shipped product with no package and no default package',
        store: NO_DEFAULT_PACKAGE,
        file: file({ package: '' }),
        expect: [row2('package', 'MISSING_REQUIRED')]
      },
      {
        name: 'an update that makes a virtual product shipped, with no package to use',
        store: {
          ...NO_DEFAULT_PACKAGE,
          products: [
            {
              sku: 'TSH-1',
              urlKey: 'classic-tee',
              attributeGroup: 'Default',
              noShippingRequired: true
            }
          ]
        },
        file: file({ ...KEY_ONLY, no_shipping_required: '0' }),
        expect: [row2('package', 'MISSING_REQUIRED')]
      }
    ]
  }
});

export const PRD_08 = defineProductRule({
  id: 'PRD-08',
  entity: 'product',
  layer: 'S',
  source: 'engine',
  op: 'B',
  code: 'IGNORED_VALUE',
  testedBy: 'example',
  summary:
    'no_shipping_required = 1 together with a package or a weight: core stores weight 0 and no package, silently.',
  examples: {
    pass: [
      {
        name: 'a virtual product with neither',
        file: file({ no_shipping_required: '1', package: '', weight: '' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a virtual product with a package and a weight',
        file: file({ no_shipping_required: '1' }),
        expect: [
          row2('package', 'IGNORED_VALUE'),
          row2('weight', 'IGNORED_VALUE')
        ]
      },
      {
        name: 'a virtual product with a weight only',
        file: file({ no_shipping_required: '1', package: '' }),
        expect: [row2('weight', 'IGNORED_VALUE')]
      }
    ]
  }
});

export const PRD_09 = defineProductRule({
  id: 'PRD-09',
  entity: 'product',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'REFERENCE_NOT_FOUND',
  testedBy: 'example',
  summary:
    'attribute_group, package and tax_class exist, matched by name ignoring letter case (D-6).',
  examples: {
    pass: [
      {
        name: 'the names in another letter case and with spaces around',
        file: file({
          attribute_group: ' default ',
          package: 'STANDARD BOX',
          tax_class: 'taxable goods'
        }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'an attribute group that does not exist',
        file: file({ attribute_group: 'Nope' }),
        expect: [row2('attribute_group', 'REFERENCE_NOT_FOUND')]
      },
      {
        name: 'a package that does not exist',
        file: file({ package: 'Nope' }),
        expect: [row2('package', 'REFERENCE_NOT_FOUND')]
      },
      {
        name: 'a tax class that does not exist',
        file: file({ tax_class: 'Nope' }),
        expect: [row2('tax_class', 'REFERENCE_NOT_FOUND')]
      }
    ]
  }
});

export const PRD_10 = defineProductRule({
  id: 'PRD-10',
  entity: 'product',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'REFERENCE_NOT_FOUND',
  testedBy: 'example',
  summary: 'category (by url_key) exists in the store.',
  examples: {
    pass: [
      {
        name: 'a category in another letter case',
        file: file({ category: 'T-Shirts' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a category that does not exist',
        file: file({ category: 'hats' }),
        expect: [row2('category', 'REFERENCE_NOT_FOUND')]
      }
    ]
  }
});

export const PRD_11 = defineProductRule({
  id: 'PRD-11',
  entity: 'product',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'ATTRIBUTE_NOT_IN_GROUP',
  testedBy: 'example',
  summary:
    'Every attr: attribute is linked to the attribute group of the product (else a database trigger deletes the value on the next update).',
  examples: {
    pass: [
      { name: 'both attributes are in the group', file: file(), expect: [] }
    ],
    fail: [
      {
        name: 'size is not linked to the group',
        store: {
          ...PRODUCT_STORE,
          attributeGroups: [{ name: 'Default', attributes: ['color'] }]
        },
        file: file(),
        expect: [row2('attr:size', 'ATTRIBUTE_NOT_IN_GROUP')]
      },
      {
        name: 'the group is the one of the stored product, and size is not in it',
        store: {
          ...PRODUCT_STORE_WITH_TEE,
          attributeGroups: [{ name: 'Default', attributes: ['color'] }]
        },
        file: file({ ...KEY_ONLY, 'attr:size': 'M' }),
        expect: [row2('attr:size', 'ATTRIBUTE_NOT_IN_GROUP')]
      }
    ]
  }
});

const SIZE_AS = (type: 'multiselect' | 'text' | 'date') => ({
  ...PRODUCT_STORE,
  attributes: [
    { code: 'color', type: 'select' as const, options: ['Black', 'White'] },
    { code: 'size', type, options: ['S', 'M', 'L'] }
  ]
});

export const PRD_12 = defineProductRule({
  id: 'PRD-12',
  entity: 'product',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'OPTION_NOT_FOUND',
  alsoCodes: ['INVALID_VALUE'],
  testedBy: 'example',
  summary:
    'select: one option text that exists for the attribute. multiselect: a | list, each option existing. Text types: free text.',
  examples: {
    pass: [
      {
        name: 'an option in another letter case',
        file: file({ 'attr:color': 'black' }),
        expect: []
      },
      {
        name: 'a list of options for a multiselect',
        store: SIZE_AS('multiselect'),
        file: file({ 'attr:size': 'S|M' }),
        expect: []
      },
      {
        name: 'any text for a text attribute',
        store: SIZE_AS('text'),
        file: file({ 'attr:size': 'Made to measure' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'an option the attribute does not have',
        file: file({ 'attr:color': 'Pink' }),
        expect: [row2('attr:color', 'OPTION_NOT_FOUND')]
      },
      {
        name: 'one of the options of a list does not exist',
        store: SIZE_AS('multiselect'),
        file: file({ 'attr:size': 'S|XL' }),
        expect: [row2('attr:size', 'OPTION_NOT_FOUND')]
      },
      {
        name: 'an attribute of a type the import cannot write',
        store: SIZE_AS('date'),
        file: file({ 'attr:size': '2026-01-01' }),
        expect: [row2('attr:size', 'INVALID_VALUE')]
      }
    ]
  }
});

export const PRD_20 = defineProductRule({
  id: 'PRD-20',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'DUPLICATE_KEY_IN_FILE',
  testedBy: 'example',
  summary:
    'url_key appears once in the file (today only the database catches it, during the write). A derived url_key counts too.',
  examples: {
    pass: [
      {
        name: 'two different url_keys',
        file: productFile(
          productRow(),
          productRow({ sku: 'TSH-2', url_key: 'classic-tee-2' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the same url_key on two products',
        file: productFile(productRow(), productRow({ sku: 'TSH-2' })),
        expect: [row2('url_key', 'DUPLICATE_KEY_IN_FILE')].map((issue) => ({
          ...issue,
          rowNumber: 3
        }))
      },
      {
        name: 'a url_key made from the name that another row writes',
        file: productFile(
          productRow({ url_key: 'classic-tee' }),
          productRow({ sku: 'TSH-2', url_key: '', name: 'Classic Tee' })
        ),
        expect: [
          { code: 'DUPLICATE_KEY_IN_FILE', rowNumber: 3, column: 'url_key' }
        ]
      },
      {
        name: 'two url_keys made from the same name',
        file: productFile(
          productRow({ url_key: '', name: 'Classic Tee' }),
          productRow({ sku: 'TSH-2', url_key: '', name: 'Classic Tee' })
        ),
        expect: [
          { code: 'DUPLICATE_KEY_IN_FILE', rowNumber: 3, column: 'url_key' }
        ]
      }
    ]
  }
});

const OTHER_OWNER = {
  ...PRODUCT_STORE,
  products: [
    {
      sku: 'OTHER-1',
      urlKey: 'classic-tee',
      attributeGroup: 'Default',
      package: 'Standard Box'
    }
  ]
};

export const PRD_21 = defineProductRule({
  id: 'PRD-21',
  entity: 'product',
  layer: 'K',
  source: 'core',
  op: 'B',
  code: 'CONFLICT',
  testedBy: 'example',
  summary: 'url_key is not used by a different existing product.',
  examples: {
    pass: [
      {
        name: 'an update that keeps the url_key of the same product',
        store: PRODUCT_STORE_WITH_TEE,
        file: file(),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the url_key of another product',
        store: OTHER_OWNER,
        file: file(),
        expect: [row2('url_key', 'CONFLICT')]
      },
      {
        name: 'a url_key made from the name, that another product has',
        store: OTHER_OWNER,
        file: file({ url_key: '' }),
        expect: [row2('url_key', 'CONFLICT')]
      }
    ]
  }
});

export const PRD_22 = defineProductRule({
  id: 'PRD-22',
  entity: 'product',
  layer: 'K',
  source: 'engine',
  op: 'B',
  code: 'URL_KEY_RESERVED',
  testedBy: 'example',
  summary:
    'url_key is not a reserved route (/cart) or an enabled language code (core does not check this for products).',
  examples: {
    pass: [
      {
        name: 'a key like a route',
        file: file({ url_key: 'carts' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the key of the cart page',
        file: file({ url_key: 'cart' }),
        expect: [row2('url_key', 'URL_KEY_RESERVED')]
      }
    ]
  }
});

export const PRD_23 = defineProductRule({
  id: 'PRD-23',
  entity: 'product',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'INVALID_VALUE',
  testedBy: 'example',
  summary:
    'Each redirect_from entry starts with / and has no spaces, no ? and no #. It is stored as written (a trailing slash matters).',
  examples: {
    pass: [
      {
        name: 'paths, with and without a trailing slash',
        file: file({ redirect_from: '/product/tee|/shop/tee/' }),
        expect: []
      }
    ],
    fail: [
      ...['product/tee', '/old tee', '/old?x=1', '/old#top'].map((path) => ({
        name: path,
        file: file({ redirect_from: path }),
        expect: [row2('redirect_from')]
      })),
      {
        name: 'one good path and one bad',
        file: file({ redirect_from: '/good|bad' }),
        expect: [row2('redirect_from')]
      }
    ]
  }
});

export const PRD_25 = defineProductRule({
  id: 'PRD-25',
  entity: 'product',
  layer: 'S',
  source: 'engine',
  op: 'B',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'Every attribute with is_required that is linked to the product attribute group has a value (on create; on update in the merged record), so that an imported product is one the admin could save again.',
  examples: {
    pass: [
      {
        name: 'the required attribute has a value',
        store: {
          ...PRODUCT_STORE,
          attributes: [
            {
              code: 'color',
              type: 'select' as const,
              required: true,
              options: ['Black', 'White']
            },
            { code: 'size', type: 'select' as const, options: ['S', 'M'] }
          ]
        },
        file: file(),
        expect: []
      },
      {
        name: 'an update that leaves the stored value of a required attribute',
        store: {
          ...PRODUCT_STORE_WITH_TEE,
          attributes: [
            {
              code: 'color',
              type: 'select' as const,
              required: true,
              options: ['Black', 'White']
            },
            { code: 'size', type: 'select' as const, options: ['S', 'M'] }
          ]
        },
        file: file({ ...KEY_ONLY, 'attr:color': '' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a new product without a value for a required attribute',
        store: {
          ...PRODUCT_STORE,
          attributes: [
            {
              code: 'color',
              type: 'select' as const,
              required: true,
              options: ['Black', 'White']
            },
            { code: 'size', type: 'select' as const, options: ['S', 'M'] }
          ]
        },
        file: file({ 'attr:color': '' }),
        expect: [row2('attr:color', 'MISSING_REQUIRED')]
      }
    ]
  }
});

const SECOND_GROUP = {
  ...PRODUCT_STORE_WITH_TEE,
  attributeGroups: [
    { name: 'Default', attributes: ['color', 'size'] },
    { name: 'Other', attributes: [] as string[] }
  ]
};

export const PRD_26 = defineProductRule({
  id: 'PRD-26',
  entity: 'product',
  layer: 'R',
  source: 'engine',
  op: 'U',
  code: 'VALUES_WILL_BE_REMOVED',
  testedBy: 'example',
  summary:
    'The attribute group of an existing product changes while it has values for attributes the new group does not contain: a database trigger deletes them at the next update.',
  examples: {
    pass: [
      {
        name: 'the same group',
        store: SECOND_GROUP,
        file: file({ ...KEY_ONLY, attribute_group: 'Default' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a group without color and size',
        store: SECOND_GROUP,
        file: file({ ...KEY_ONLY, attribute_group: 'Other' }),
        expect: [row2('attribute_group', 'VALUES_WILL_BE_REMOVED')]
      }
    ]
  }
});

export const PRD_27 = defineProductRule({
  id: 'PRD-27',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'DUPLICATE_KEY_IN_FILE',
  alsoCodes: ['CONFLICT', 'IGNORED_VALUE'],
  testedBy: 'example',
  summary:
    'redirect_from paths: the same path on more than one row is an error; a path that is already a redirect of another entity is an error; a path that is a live url_rewrite path is useless, because the redirect runs only for a path that matches no route (a warning).',
  examples: {
    pass: [
      {
        name: 'a path nobody has',
        file: file({ redirect_from: '/product/tee/' }),
        expect: []
      },
      {
        name: 'an update that keeps a redirect it owns',
        store: {
          ...PRODUCT_STORE_WITH_TEE,
          redirects: [
            {
              from: '/product/tee/',
              entityUrn: 'urn:evershop:catalog:product:uuid-TSH-1'
            }
          ]
        },
        file: file({ redirect_from: '/product/tee/' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'the same path on two rows',
        file: productFile(
          productRow({ redirect_from: '/old' }),
          productRow({
            sku: 'TSH-2',
            url_key: 'classic-tee-2',
            redirect_from: '/old'
          })
        ),
        expect: [
          {
            code: 'DUPLICATE_KEY_IN_FILE',
            rowNumber: 3,
            column: 'redirect_from'
          }
        ]
      },
      {
        name: 'a path that is a redirect of another record',
        store: {
          ...PRODUCT_STORE,
          redirects: [{ from: '/old', entityUrn: 'urn:evershop:cms:page:x' }]
        },
        file: file({ redirect_from: '/old' }),
        expect: [row2('redirect_from', 'CONFLICT')]
      },
      {
        name: 'a path that is a redirect of no record',
        store: { ...PRODUCT_STORE, redirects: [{ from: '/old' }] },
        file: file({ redirect_from: '/old' }),
        expect: [row2('redirect_from', 'CONFLICT')]
      },
      {
        name: 'a path that is the address of a live page',
        store: { ...PRODUCT_STORE, rewritePaths: ['/live'] },
        file: file({ redirect_from: '/live' }),
        expect: [row2('redirect_from', 'IGNORED_VALUE')]
      }
    ]
  }
});

export const PRD_28 = defineProductRule({
  id: 'PRD-28',
  entity: 'product',
  layer: 'S',
  source: 'engine',
  op: 'C',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'A blank url_key on a row that creates a product is derived from the name with slugify (D-24). With nothing left (a name with no Latin letters) the row is refused. On an update a blank cell leaves the stored url_key alone.',
  examples: {
    pass: [
      {
        name: 'a blank url_key and a name',
        file: file({ url_key: '' }),
        expect: []
      },
      {
        name: 'an update with a blank url_key keeps the stored one',
        store: PRODUCT_STORE_WITH_TEE,
        file: file({ url_key: '', name: '日本語' }),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a name with no Latin letters',
        file: file({ url_key: '', name: '日本語' }),
        expect: [row2('url_key', 'MISSING_REQUIRED')]
      }
    ]
  }
});

// ---- Variant groups (§ 5.3, PRD-13 to PRD-19, PRD-24) ----------------------

/** A member of the group `tee`: its axes are color and size. */
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

const members = (...rows: string[]) => productFile(...rows);

const issueAt = (
  rowNumber: number,
  column: string,
  code: string
): { code: never; rowNumber: number; column: string } => ({
  code: code as never,
  rowNumber,
  column
});

/** The store with two packages and two attribute groups, for the rules that compare members. */
const TWO_OF_EACH = {
  ...PRODUCT_STORE,
  packages: [{ name: 'Standard Box', isDefault: true }, { name: 'Pallet' }],
  taxClasses: [{ name: 'Taxable Goods' }, { name: 'Exempt' }],
  categories: [
    { urlKey: 't-shirts', name: 'T-shirts', status: 1 as const },
    { urlKey: 'hoodies', name: 'Hoodies', status: 1 as const }
  ],
  attributeGroups: [
    { name: 'Default', attributes: ['color', 'size'] },
    { name: 'Other', attributes: ['color', 'size'] }
  ]
};

export const PRD_13 = defineProductRule({
  id: 'PRD-13',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'VARIANT_INCONSISTENT',
  testedBy: 'example',
  summary:
    'Rows with a variant_group label have variant_axes: 1 to 5 attribute codes, no code twice, the same set on every row of the label (the stored order is the database order, not the order of the file).',
  examples: {
    pass: [
      {
        name: 'two members, the axes in another order on the second',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', { variant_axes: 'size|color' })
        ),
        expect: []
      },
      {
        name: 'axes written in capitals',
        file: members(
          member('TSH-1', 'Black', 'S', { variant_axes: 'Color|SIZE' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a group with no axes',
        file: members(member('TSH-1', 'Black', 'S', { variant_axes: '' })),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'axes without a group',
        file: members(member('TSH-1', 'Black', 'S', { variant_group: '' })),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'six axes',
        file: members(
          member('TSH-1', 'Black', 'S', { variant_axes: 'a|b|c|d|e|f' })
        ),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'an axis twice',
        file: members(
          member('TSH-1', 'Black', 'S', { variant_axes: 'color|color' })
        ),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'a second member with other axes',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', { variant_axes: 'color' })
        ),
        expect: [issueAt(3, 'variant_axes', 'VARIANT_INCONSISTENT')]
      }
    ]
  }
});

export const PRD_14 = defineProductRule({
  id: 'PRD-14',
  entity: 'product',
  layer: 'R',
  source: 'core+engine',
  op: 'B',
  code: 'VARIANT_INCONSISTENT',
  testedBy: 'example',
  summary:
    'Each axis attribute exists, has type select and is linked to the attribute group (the rule of saveGroup).',
  examples: {
    pass: [
      {
        name: 'a group of one member with two select axes',
        file: members(member('TSH-1', 'Black', 'S')),
        expect: []
      }
    ],
    fail: [
      {
        name: 'an axis that is not an attribute of the store',
        file: members(
          member('TSH-1', 'Black', 'S', { variant_axes: 'color|weave' })
        ),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'an axis that is a text attribute',
        store: {
          ...PRODUCT_STORE,
          attributes: [
            { code: 'color', type: 'select' as const, options: ['Black'] },
            { code: 'size', type: 'text' as const }
          ]
        },
        file: members(member('TSH-1', 'Black', 'S')),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'an axis that is not linked to the attribute group',
        store: {
          ...PRODUCT_STORE,
          attributeGroups: [{ name: 'Default', attributes: ['color'] }]
        },
        file: members(member('TSH-1', 'Black', 'S')),
        expect: [
          issueAt(2, 'attr:size', 'ATTRIBUTE_NOT_IN_GROUP'),
          issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')
        ]
      }
    ]
  }
});

export const PRD_15 = defineProductRule({
  id: 'PRD-15',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'VARIANT_INCONSISTENT',
  testedBy: 'example',
  summary: 'Every member has a value for every axis.',
  examples: {
    pass: [
      {
        name: 'an update keeps the stored value of an axis',
        store: PRODUCT_STORE_WITH_TEE,
        file: members(
          member('TSH-1', '', '', {
            ...KEY_ONLY,
            variant_group: 'tee',
            variant_axes: 'color|size'
          })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a member without a size',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', '')
        ),
        expect: [issueAt(3, 'attr:size', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'two members without a size are not also called equal',
        file: members(
          member('TSH-1', 'Black', ''),
          member('TSH-2', 'Black', '')
        ),
        expect: [
          issueAt(2, 'attr:size', 'VARIANT_INCONSISTENT'),
          issueAt(3, 'attr:size', 'VARIANT_INCONSISTENT')
        ]
      }
    ]
  }
});

export const PRD_16 = defineProductRule({
  id: 'PRD-16',
  entity: 'product',
  layer: 'X',
  source: 'core+engine',
  op: 'B',
  code: 'VARIANT_INCONSISTENT',
  testedBy: 'example',
  summary:
    'All members share one attribute group and one package (a joining product silently adopts the package of the group). A blank package counts as the default package (D-25).',
  examples: {
    pass: [
      {
        name: 'a blank package and the default package are the same',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S', { package: 'Standard Box' }),
          member('TSH-2', 'White', 'M', { package: '' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'two packages',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', { package: 'Pallet' })
        ),
        expect: [issueAt(3, 'package', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'two attribute groups',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', { attribute_group: 'Other' })
        ),
        expect: [issueAt(3, 'attribute_group', 'VARIANT_INCONSISTENT')]
      }
    ]
  }
});

export const PRD_17 = defineProductRule({
  id: 'PRD-17',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'VARIANT_NOT_ADJACENT',
  testedBy: 'example',
  summary:
    'The rows of one group are next to each other in the file, so that a group can be written while the file streams.',
  examples: {
    pass: [
      {
        name: 'two groups, each together',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'S'),
          member('HOD-1', 'Black', 'S', { variant_group: 'hoodie' }),
          member('HOD-2', 'White', 'S', { variant_group: 'hoodie' })
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a product of another group between two members',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('HOD-1', 'Black', 'S', { variant_group: 'hoodie' }),
          member('TSH-2', 'White', 'S')
        ),
        expect: [issueAt(4, 'variant_group', 'VARIANT_NOT_ADJACENT')]
      },
      {
        name: 'a product without a group between two members',
        file: members(
          member('TSH-1', 'Black', 'S'),
          productRow({ sku: 'MUG-1', url_key: 'mug-1' }),
          member('TSH-2', 'White', 'S')
        ),
        expect: [issueAt(4, 'variant_group', 'VARIANT_NOT_ADJACENT')]
      }
    ]
  }
});

const STORED_TEES = (extra: {
  groups?: Array<{
    label: string;
    attributeGroup: string;
    axes: string[];
  }>;
  products?: Array<{
    sku: string;
    variantGroup: string | null;
    package?: string;
    values?: Record<string, string>;
  }>;
}) => ({
  ...TWO_OF_EACH,
  variantGroups: extra.groups ?? [
    { label: 'g1', attributeGroup: 'Default', axes: ['color', 'size'] },
    { label: 'g2', attributeGroup: 'Default', axes: ['color', 'size'] }
  ],
  products: (
    extra.products ?? [
      { sku: 'TSH-1', variantGroup: 'g1' },
      { sku: 'TSH-2', variantGroup: 'g2' }
    ]
  ).map((product) => ({
    attributeGroup: 'Default',
    package: 'Standard Box',
    values: { color: 'Black', size: 'S' },
    ...product,
    urlKey: product.sku.toLowerCase()
  }))
});

export const PRD_18 = defineProductRule({
  id: 'PRD-18',
  entity: 'product',
  layer: 'R',
  source: 'engine',
  op: 'B',
  code: 'VARIANT_CONFLICT',
  alsoCodes: ['VARIANT_INCONSISTENT'],
  testedBy: 'example',
  summary:
    'Existing members that sit in different groups, or two labels of the file that map to the same stored group, are refused. The axes (as a set), the attribute group or the package of the file must equal those of the stored group. The import never moves a product between groups.',
  examples: {
    pass: [
      {
        name: 'members of one stored group, with the same axes, group and package',
        store: STORED_TEES({
          products: [
            {
              sku: 'TSH-1',
              variantGroup: 'g1',
              values: { color: 'Black', size: 'S' }
            },
            {
              sku: 'TSH-2',
              variantGroup: 'g1',
              values: { color: 'White', size: 'S' }
            }
          ]
        }),
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'S')
        ),
        expect: []
      },
      {
        name: 'a new member joins a stored group',
        store: STORED_TEES({
          products: [
            {
              sku: 'TSH-1',
              variantGroup: 'g1',
              values: { color: 'Black', size: 'S' }
            }
          ]
        }),
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-9', 'White', 'M')
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'two members that are in different stored groups',
        store: STORED_TEES({}),
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M')
        ),
        expect: [issueAt(3, 'variant_group', 'VARIANT_CONFLICT')]
      },
      {
        name: 'two labels of the file that are one stored group',
        store: STORED_TEES({
          products: [
            { sku: 'TSH-1', variantGroup: 'g1' },
            {
              sku: 'TSH-2',
              variantGroup: 'g1',
              values: { color: 'White', size: 'S' }
            }
          ]
        }),
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'S', { variant_group: 'other' })
        ),
        expect: [issueAt(3, 'variant_group', 'VARIANT_CONFLICT')]
      },
      {
        name: 'axes that are not those of the stored group',
        store: STORED_TEES({
          groups: [{ label: 'g1', attributeGroup: 'Default', axes: ['color'] }],
          products: [{ sku: 'TSH-1', variantGroup: 'g1' }]
        }),
        file: members(member('TSH-1', 'Black', 'S')),
        expect: [issueAt(2, 'variant_axes', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'an attribute group that is not that of the stored group',
        store: STORED_TEES({
          groups: [
            { label: 'g1', attributeGroup: 'Other', axes: ['color', 'size'] }
          ],
          products: [{ sku: 'TSH-1', variantGroup: 'g1' }]
        }),
        file: members(member('TSH-1', 'Black', 'S')),
        expect: [issueAt(2, 'attribute_group', 'VARIANT_INCONSISTENT')]
      },
      {
        name: 'a package that is not that of the stored group',
        store: STORED_TEES({
          products: [{ sku: 'TSH-1', variantGroup: 'g1', package: 'Pallet' }]
        }),
        file: members(member('TSH-1', 'Black', 'S')),
        expect: [issueAt(2, 'package', 'VARIANT_INCONSISTENT')]
      }
    ]
  }
});

export const PRD_19 = defineProductRule({
  id: 'PRD-19',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'VARIANT_DUPLICATE_COMBINATION',
  testedBy: 'example',
  summary:
    'Two members of one group have the same axis combination (the group counted as it will be after the import: the members of the file plus the stored members of a reused group). An error: a storefront would show two identical choices.',
  examples: {
    pass: [
      {
        name: 'every combination different',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'Black', 'M'),
          member('TSH-3', 'White', 'S')
        ),
        expect: []
      },
      {
        name: 'a stored member listed again with new values takes the place of its old ones',
        store: STORED_TEES({
          products: [
            {
              sku: 'TSH-1',
              variantGroup: 'g1',
              values: { color: 'Black', size: 'S' }
            },
            {
              sku: 'TSH-2',
              variantGroup: 'g1',
              values: { color: 'White', size: 'S' }
            }
          ]
        }),
        file: members(
          member('TSH-2', 'Black', 'M'),
          member('TSH-1', 'White', 'S')
        ),
        expect: []
      }
    ],
    fail: [
      {
        name: 'two members with the same values',
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'S'),
          member('TSH-3', 'Black', 'S')
        ),
        expect: [issueAt(4, 'variant_group', 'VARIANT_DUPLICATE_COMBINATION')]
      },
      {
        name: 'a new member with the values of a stored member that is not in the file',
        store: STORED_TEES({
          products: [
            {
              sku: 'TSH-1',
              variantGroup: 'g1',
              values: { color: 'Black', size: 'S' }
            },
            {
              sku: 'TSH-9',
              variantGroup: 'g1',
              values: { color: 'White', size: 'L' }
            }
          ]
        }),
        file: members(
          member('TSH-1', 'Black', 'M'),
          member('TSH-8', 'White', 'L')
        ),
        expect: [issueAt(3, 'variant_group', 'VARIANT_DUPLICATE_COMBINATION')]
      }
    ]
  }
});

export const PRD_24 = defineProductRule({
  id: 'PRD-24',
  entity: 'product',
  layer: 'X',
  source: 'engine',
  op: 'B',
  code: 'VARIANT_INCONSISTENT',
  testedBy: 'example',
  summary:
    'The members of one group carry identical category, tax_class, no_shipping_required, weight and identical values for every non-axis attr: column, because an update of one member copies these to all the others.',
  examples: {
    pass: [
      {
        name: 'the same cells on every member',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M')
        ),
        expect: []
      },
      {
        name: 'the same tax class in another letter case',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', { tax_class: 'taxable goods' })
        ),
        expect: []
      }
    ],
    fail: [
      ...(
        [
          ['category', 'hoodies'],
          ['tax_class', 'Exempt'],
          ['weight', '0.5']
        ] as const
      ).map(([column, value]) => ({
        name: `a different ${column}`,
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', { [column]: value })
        ),
        expect: [issueAt(3, column, 'VARIANT_INCONSISTENT')]
      })),
      {
        name: 'a different no_shipping_required (and the weight it drops)',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S'),
          member('TSH-2', 'White', 'M', {
            no_shipping_required: '1',
            package: '',
            weight: ''
          })
        ),
        expect: [
          issueAt(3, 'no_shipping_required', 'VARIANT_INCONSISTENT'),
          issueAt(3, 'weight', 'VARIANT_INCONSISTENT')
        ]
      },
      {
        name: 'a different value of an attribute that is not an axis',
        store: TWO_OF_EACH,
        file: members(
          member('TSH-1', 'Black', 'S', { variant_axes: 'color' }),
          member('TSH-2', 'White', 'M', { variant_axes: 'color' })
        ),
        expect: [issueAt(3, 'attr:size', 'VARIANT_INCONSISTENT')]
      }
    ]
  }
});

export const IMG_02 = defineProductRule({
  id: 'IMG-02',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'DUPLICATE_VALUE',
  testedBy: 'example',
  summary: 'The same URL twice in one cell is used once (a warning).',
  examples: {
    pass: [
      {
        entity: 'product',
        store: PRODUCT_STORE,
        name: 'two different images',
        file: file({
          images: 'https://example.com/a.jpg|https://example.com/b.jpg'
        }),
        expect: []
      }
    ],
    fail: [
      {
        entity: 'product',
        store: PRODUCT_STORE,
        name: 'the same image twice',
        file: file({
          images: 'https://example.com/a.jpg|https://example.com/a.jpg'
        }),
        expect: [row2('images', 'DUPLICATE_VALUE')]
      }
    ]
  }
});

export const PRODUCT_RULES = [
  PRD_01,
  PRD_02,
  PRD_03,
  PRD_04,
  PRD_05,
  PRD_06,
  PRD_07,
  PRD_08,
  PRD_09,
  PRD_10,
  PRD_11,
  PRD_12,
  PRD_13,
  PRD_14,
  PRD_15,
  PRD_16,
  PRD_17,
  PRD_18,
  PRD_19,
  PRD_20,
  PRD_21,
  PRD_22,
  PRD_23,
  PRD_24,
  PRD_25,
  PRD_26,
  PRD_27,
  PRD_28,
  IMG_02
];
