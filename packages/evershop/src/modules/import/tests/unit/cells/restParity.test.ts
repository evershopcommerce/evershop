import { describe, it, expect } from '@jest/globals';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import escapePayload from '../../../../base/services/escapePayload.js';
import {
  escapeHtmlTags,
  isEscapeExempt
} from '../../../services/cells/text.js';
import { chunked, collect } from '../helpers/readAll.js';
import type { ImportEntity } from '../../../services/types.js';

/**
 * The import calls the services directly, so it must do what the REST layer
 * does before them (D-23, ALL-22). These tests tie the engine to the REST
 * layer's own code and schemas: when REST changes, they fail.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const modules = path.resolve(here, '../../../..');
const fixtures = path.resolve(here, '../../fixtures');

function restEscape(text: string): string {
  const body = { value: text };
  escapePayload(body);
  return body.value;
}

describe('escapeHtmlTags equals the escape of the REST layer', () => {
  it('on 20,000 random strings made of the characters that matter', () => {
    const alphabet = [
      '<',
      '>',
      '/',
      'a',
      'B',
      '1',
      ' ',
      '\n',
      '&',
      '"',
      "'",
      '=',
      'x',
      '-'
    ];
    let seed = 987654321;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let i = 0; i < 20_000; i += 1) {
      const length = next() % 40;
      let text = '';
      for (let j = 0; j < length; j += 1) {
        text += alphabet[next() % alphabet.length];
      }
      const expected = restEscape(text);
      if (escapeHtmlTags(text) !== expected) {
        throw new Error(
          `Different on ${JSON.stringify(text)}: ${JSON.stringify(
            escapeHtmlTags(text)
          )} and ${JSON.stringify(expected)}`
        );
      }
    }
  });

  it.each([
    ['<b>x</b>'],
    ['Tom & Jerry'],
    ['<h1>x</h1>'],
    ['<br/>'],
    ['<br />'],
    ['a<b>c<i>d</i>e</b>f'],
    ['<a href="x">y'],
    ['>>><a <a >'],
    ['<a x>y</a>']
  ])('on the hand-picked %j', (text) => {
    expect(escapeHtmlTags(text)).toBe(restEscape(text));
  });
});

/** The names of the properties of a REST payload that carry `skipEscape`. */
function skippedProperties(file: string): string[] {
  const schema = JSON.parse(readFileSync(path.join(modules, file), 'utf8'));
  return Object.entries(schema.properties ?? {})
    .filter(([, property]) => (property as { skipEscape?: boolean }).skipEscape)
    .map(([name]) => name)
    .sort();
}

describe('the columns that are not escaped are the properties REST does not escape (ALL-22)', () => {
  const productFiles = [
    'catalog/api/createProduct/payloadSchema.json',
    'catalog/api/updateProduct/payloadSchema.json'
  ];
  const categoryFiles = [
    'catalog/api/createCategory/payloadSchema.json',
    'catalog/api/updateCategory/payloadSchema.json'
  ];

  it('finds the schemas', () => {
    for (const file of [...productFiles, ...categoryFiles]) {
      expect(existsSync(path.join(modules, file))).toBe(true);
    }
  });

  it.each([...productFiles, ...categoryFiles])(
    '%s skips the escape for the description and the custom fields only',
    (file) => {
      expect(skippedProperties(file)).toEqual(['description', 'metafields']);
    }
  );

  it('skips nothing in the REST payloads that create or change a customer or an address', () => {
    const apiDir = path.join(modules, 'customer/api');
    const skipped: Record<string, string[]> = {};
    for (const name of readdirSync(apiDir)) {
      const file = `customer/api/${name}/payloadSchema.json`;
      if (existsSync(path.join(modules, file))) {
        const properties = skippedProperties(file);
        if (properties.length > 0) {
          skipped[name] = properties;
        }
      }
    }
    // Custom fields are the only property; `password` is escaped by REST and
    // is exempt in the import because a secret is hashed as it was written.
    expect(skipped).toEqual({ updateCustomerMetafields: ['metafields'] });
  });

  /**
   * For every column of the example files: not escaped by the import exactly
   * when REST does not escape it, except the two secret columns, which only the
   * import leaves alone.
   */
  const cases: [ImportEntity, string, string[], string[]][] = [
    ['product', 'products.csv', ['description', 'metafields'], []],
    ['category', 'categories.csv', ['description', 'metafields'], []],
    [
      'customer',
      'customers.csv',
      ['metafields'],
      ['password', 'password_hash']
    ],
    ['customerAddress', 'customer-addresses.csv', [], []]
  ];

  it.each(cases)(
    'the columns of the %s example file (%s)',
    async (entity, fileName, restSkips, secrets) => {
      const file = readFileSync(path.join(fixtures, fileName));
      const { columns } = await collect(chunked(file));
      expect(columns?.length).toBeGreaterThan(5);
      for (const column of columns ?? []) {
        const restSkipsIt = column.startsWith('metafield:')
          ? restSkips.includes('metafields')
          : restSkips.includes(column);
        const expected = restSkipsIt || secrets.includes(column);
        expect([column, isEscapeExempt(entity, column)]).toEqual([
          column,
          expected
        ]);
      }
    }
  );
});
