import {
  METAFIELD_STORE,
  METAFIELD_STORE_NEW,
  metafieldCreateFile,
  metafieldFile
} from './metafieldFiles.js';
import { PRODUCT_STORE_WITH_TEE } from './productFiles.js';
import { defineRule } from './rule.js';
import type { ExampleRuleDefinition, RuleExample } from './rule.js';

/**
 * The rules of the custom fields (§ 7.4, `MET`; products, categories and
 * customers). Each is shown on a product file with one custom-field cell; the
 * categories and the customers follow the same code.
 */
const withStore = (examples: RuleExample[]): RuleExample[] =>
  examples.map((example) => ({
    entity: 'product' as const,
    store: METAFIELD_STORE,
    ...example
  }));

const defineFieldRule = (definition: ExampleRuleDefinition) =>
  defineRule({
    ...definition,
    examples: {
      pass: withStore(definition.examples.pass),
      fail: withStore(definition.examples.fail)
    }
  });

const bad = (key: string) => ({
  code: 'METAFIELD_INVALID' as const,
  rowNumber: 2,
  column: `metafield:${key}`
});

const one = (key: string, value: string) => metafieldFile({ [key]: value });

export const MET_01 = defineFieldRule({
  id: 'MET-01',
  entity: 'all',
  layer: 'C',
  source: 'core',
  op: 'B',
  code: 'METAFIELD_INVALID',
  testedBy: 'example',
  summary:
    'The value fits the type: an integer and a number are numeric, a boolean is 1, 0, true or false, a date is YYYY-MM-DD, a color is #RRGGBB, a url has a scheme, a group is a JSON object of its sub-fields.',
  examples: {
    pass: [
      ...[
        ['custom.material', 'Organic cotton'],
        ['custom.years', '-3'],
        ['custom.rate', '2.5'],
        ['custom.eco', 'TRUE'],
        ['custom.eco', '0'],
        ['custom.launch', '2026-03-01'],
        ['custom.tone', '#aA00ff'],
        ['custom.link', 'https://example.com/care?x=1']
      ].map(([key, value]) => ({
        name: `${key} = ${value}`,
        file: one(key, value),
        expect: []
      })),
      {
        name: 'a group with its sub-fields',
        file: one('custom.specs', '{"fit":"Relaxed","gsm":180}'),
        expect: []
      }
    ],
    fail: [
      ...[
        ['custom.years', 'abc'],
        ['custom.years', '1.5'],
        ['custom.years', '1,000'],
        ['custom.rate', '2,5'],
        ['custom.rate', 'x'],
        ['custom.eco', 'maybe'],
        ['custom.launch', '2026-02-30'],
        ['custom.launch', '1 March'],
        ['custom.tone', '#fff'],
        ['custom.tone', 'red'],
        ['custom.link', 'example.com'],
        ['custom.link', 'https://exa mple.com']
      ].map(([key, value]) => ({
        name: `${key} = ${value}`,
        file: one(key, value),
        expect: [bad(key)]
      })),
      {
        name: 'a group that is a list',
        file: one('custom.specs', '[1]'),
        expect: [bad('custom.specs')]
      }
    ]
  }
});

export const MET_02 = defineFieldRule({
  id: 'MET-02',
  entity: 'all',
  layer: 'C',
  source: 'core',
  op: 'B',
  code: 'METAFIELD_INVALID',
  testedBy: 'example',
  summary:
    'The validations of the definition hold: size, range, regexp, choices (applied to each item of a list).',
  examples: {
    pass: [
      ['custom.warranty', '10'],
      ['custom.code', 'abc'],
      ['custom.sku_like', 'ABC-12'],
      ['custom.fit', 'slim']
    ].map(([key, value]) => ({
      name: `${key} = ${value}`,
      file: one(key, value),
      expect: []
    })),
    fail: [
      ['custom.warranty', '11'],
      ['custom.warranty', '-1'],
      ['custom.code', 'a'],
      ['custom.code', 'abcde'],
      ['custom.sku_like', 'abc-12'],
      ['custom.fit', 'baggy']
    ].map(([key, value]) => ({
      name: `${key} = ${value}`,
      file: one(key, value),
      expect: [bad(key)]
    }))
  }
});

export const MET_03 = defineFieldRule({
  id: 'MET-03',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'METAFIELD_INVALID',
  testedBy: 'example',
  summary: 'A list field is split on | and every item is checked.',
  examples: {
    pass: [
      {
        name: 'items that are choices',
        file: one('custom.care', 'wash|dry'),
        expect: []
      },
      {
        name: 'whole numbers',
        file: one('custom.sizes', '36|38|40'),
        expect: []
      },
      {
        name: 'empty items are dropped',
        file: one('custom.care', 'wash||dry|'),
        expect: []
      }
    ],
    fail: [
      {
        name: 'one item that is not a choice',
        file: one('custom.care', 'wash|iron'),
        expect: [bad('custom.care')]
      },
      {
        name: 'one item that is not a whole number',
        file: one('custom.sizes', '36|x|40'),
        expect: [bad('custom.sizes')]
      }
    ]
  }
});

export const MET_04 = defineFieldRule({
  id: 'MET-04',
  entity: 'all',
  layer: 'S',
  source: 'engine',
  op: 'C',
  code: 'MISSING_REQUIRED',
  testedBy: 'example',
  summary:
    'A required definition: on create a blank cell is an error; on update the stored value counts. Core enforces required only when the payload carries custom fields, and the import always sends them.',
  examples: {
    pass: [
      {
        name: 'the required field has a value',
        store: METAFIELD_STORE_NEW(['custom.material']),
        file: metafieldCreateFile({ 'custom.material': 'Cotton' }),
        expect: []
      },
      {
        name: 'an update that leaves the stored value of a required field',
        store: {
          ...METAFIELD_STORE,
          metafieldDefinitions: METAFIELD_STORE_NEW(['custom.material'])
            .metafieldDefinitions,
          products: [
            {
              ...PRODUCT_STORE_WITH_TEE.products[0],
              metaData: { custom: { material: 'Cotton' } }
            }
          ]
        },
        file: 'sku,price\nTSH-1,30\n',
        expect: []
      }
    ],
    fail: [
      {
        name: 'a new product without a cell for a required field',
        store: METAFIELD_STORE_NEW(['custom.material']),
        file: metafieldCreateFile(),
        expect: [
          {
            code: 'MISSING_REQUIRED',
            rowNumber: 2,
            column: 'metafield:custom.material'
          }
        ]
      },
      {
        name: 'a new product with a blank cell for a required field',
        store: METAFIELD_STORE_NEW(['custom.material']),
        file: metafieldCreateFile({ 'custom.material': '' }),
        expect: [
          {
            code: 'MISSING_REQUIRED',
            rowNumber: 2,
            column: 'metafield:custom.material'
          }
        ]
      },
      {
        name: 'an update of a product that has no value for a required field',
        store: {
          ...METAFIELD_STORE,
          metafieldDefinitions: METAFIELD_STORE_NEW(['custom.material'])
            .metafieldDefinitions
        },
        file: 'sku,price\nTSH-1,30\n',
        expect: [
          {
            code: 'MISSING_REQUIRED',
            rowNumber: 2,
            column: 'metafield:custom.material'
          }
        ]
      }
    ]
  }
});

const ROWS = (text: string) =>
  `[{"content":[{"id":"r","size":1,"columns":[{"id":"c","size":1,"data":{"blocks":[{"id":"b","type":"paragraph","data":{"text":"${text}"}}]}}]}]}]`;

export const MET_05 = defineFieldRule({
  id: 'MET-05',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'METAFIELD_INVALID',
  alsoCodes: ['INVALID_JSON'],
  testedBy: 'example',
  summary:
    'Rich text: plain text or HTML becomes the blocks of the editor (at least one); a list of rich texts takes JSON ([{"content": rows}]).',
  examples: {
    pass: [
      {
        name: 'plain text',
        file: one('custom.story', 'Our story.\n\nIn two paragraphs.'),
        expect: []
      },
      {
        name: 'HTML',
        file: one('custom.story', '<p>Our <b>story</b>.</p>'),
        expect: []
      },
      {
        name: 'a list as JSON',
        file: one('custom.stories', ROWS('Hello')),
        expect: []
      }
    ],
    fail: [
      {
        name: 'a list that is not JSON',
        file: one('custom.stories', 'just text'),
        expect: [
          {
            code: 'INVALID_JSON',
            rowNumber: 2,
            column: 'metafield:custom.stories'
          }
        ]
      },
      {
        name: 'a list that is not an array',
        file: one('custom.stories', '{"content":[]}'),
        expect: [bad('custom.stories')]
      }
    ]
  }
});

export const MET_06 = defineRule({
  id: 'MET-06',
  entity: 'all',
  layer: 'C',
  source: 'engine',
  op: 'B',
  code: 'METAFIELD_INVALID',
  testedBy: 'runner',
  test: 'tests/unit/validate/productValidator.test.ts',
  summary:
    'The problems are collected per column: every cell is checked on its own (core throws at the first failure and drops a key with no definition), so one row can show several.'
});

export const METAFIELD_RULES = [MET_01, MET_02, MET_03, MET_04, MET_05, MET_06];
