import type { StoreFixture } from '../ports/lookup.js';
import { csvLine } from '../report/csvWrite.js';
import {
  PRODUCT_HEADER,
  PRODUCT_STORE,
  PRODUCT_STORE_WITH_TEE,
  productRow
} from './productFiles.js';

/**
 * Builders for the examples of the custom-field rules (§ 5.9, `MET`): a product
 * file with `metafield:` columns, against a store that has the definitions.
 */
const GROUP_OF_SPECS = [
  { key: 'fit', type: 'short_text' as const, required: true },
  { key: 'gsm', type: 'integer' as const }
];

export const METAFIELD_DEFINITIONS = [
  { namespace: 'custom', key: 'material', type: 'short_text' as const },
  { namespace: 'custom', key: 'story', type: 'rich_text' as const },
  {
    namespace: 'custom',
    key: 'stories',
    type: 'rich_text' as const,
    isList: true
  },
  { namespace: 'custom', key: 'years', type: 'integer' as const },
  { namespace: 'custom', key: 'rate', type: 'number' as const },
  { namespace: 'custom', key: 'eco', type: 'boolean' as const },
  { namespace: 'custom', key: 'launch', type: 'date' as const },
  { namespace: 'custom', key: 'tone', type: 'color' as const },
  { namespace: 'custom', key: 'link', type: 'url' as const },
  {
    namespace: 'custom',
    key: 'warranty',
    type: 'integer' as const,
    validations: [{ type: 'range' as const, min: 0, max: 10 }]
  },
  {
    namespace: 'custom',
    key: 'code',
    type: 'short_text' as const,
    validations: [{ type: 'size' as const, min: 2, max: 4 }]
  },
  {
    namespace: 'custom',
    key: 'sku_like',
    type: 'short_text' as const,
    validations: [{ type: 'regexp' as const, pattern: '^[A-Z]{3}-\\d+$' }]
  },
  {
    namespace: 'custom',
    key: 'fit',
    type: 'short_text' as const,
    validations: [
      { type: 'choices' as const, values: ['slim', 'relaxed'] as string[] }
    ]
  },
  {
    namespace: 'custom',
    key: 'care',
    type: 'short_text' as const,
    isList: true,
    validations: [
      { type: 'choices' as const, values: ['wash', 'dry'] as string[] }
    ]
  },
  { namespace: 'custom', key: 'sizes', type: 'integer' as const, isList: true },
  {
    namespace: 'custom',
    key: 'specs',
    type: 'group' as const,
    subFields: GROUP_OF_SPECS
  },
  {
    namespace: 'custom',
    key: 'parts',
    type: 'group' as const,
    isList: true,
    subFields: GROUP_OF_SPECS
  }
];

const withFields = (
  store: StoreFixture,
  required: string[] = []
): StoreFixture => ({
  ...store,
  metafieldDefinitions: {
    product: METAFIELD_DEFINITIONS.map((definition) => ({
      ...definition,
      required: required.includes(`${definition.namespace}.${definition.key}`)
    }))
  }
});

/** The store of the examples with the definitions, and `TSH-1` stored (an update). */
export const METAFIELD_STORE = withFields(PRODUCT_STORE_WITH_TEE);
/** The same with the product not stored (a create), and some fields required. */
export const METAFIELD_STORE_NEW = (required: string[] = []) =>
  withFields(PRODUCT_STORE, required);

/** An update file: the sku and these `namespace.key` cells. */
export function metafieldFile(cells: Record<string, string>): string {
  const keys = Object.keys(cells);
  return (
    csvLine(['sku', ...keys.map((key) => `metafield:${key}`)]) +
    csvLine(['TSH-1', ...keys.map((key) => cells[key])])
  ).replace(/\r\n/g, '\n');
}

/** A file whose row creates `TSH-1` and has these `namespace.key` cells. */
export function metafieldCreateFile(
  cells: Record<string, string> = {}
): string {
  const keys = Object.keys(cells);
  const header = [
    PRODUCT_HEADER,
    ...keys.map((key) => `metafield:${key}`)
  ].join(',');
  const row = [
    productRow(),
    ...keys.map((key) => csvLine([cells[key]]).trimEnd())
  ].join(',');
  return `${header}\n${row}\n`;
}
