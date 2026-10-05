import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A product card learns that a product has variants from `variantGroupId`. Every list gets its
 * products from its own copy of the same GraphQL fields: there is no shared fragment, each page
 * and widget declares `fragment Product on Product` itself and the build reads it as a literal.
 * A copy that misses the field makes its cards offer "Add to Cart" for a product that needs a choice,
 * and nothing complains. So every selection that feeds a card is listed here.
 */
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!['tests', 'node_modules', 'admin'].includes(entry.name)) {
        yield* walk(path.join(dir, entry.name));
      }
    } else if (entry.name.endsWith('.js')) {
      yield path.join(dir, entry.name);
    }
  }
}
const read = (file: string) => fs.readFileSync(file, 'utf8');
const rel = (file: string) => path.relative(dist, file);

// The search box's suggestions are a dropdown, not cards.
const NOT_A_CARD = new Set(['components/frontStore/catalog/SearchBox.js']);
const withFragment = [...walk(path.join(dist, 'components')), ...walk(path.join(dist, 'modules'))]
  .filter((file) => read(file).includes('fragment Product on Product {'))
  .filter((file) => !NOT_A_CARD.has(rel(file)));

const fragmentBlock = (text: string) => {
  const start = text.indexOf('fragment Product on Product {');
  return text.slice(start, text.indexOf('`', start));
};

describe('every selection that feeds a product card asks for variantGroupId', () => {
  it('found the fragments (a scan that finds none would pass for the wrong reason)', () => {
    expect(withFragment.length).toBeGreaterThanOrEqual(10);
  });

  it.each(withFragment.map((file) => [rel(file), file]))('%s: fragment Product', (_name, file) => {
    expect(fragmentBlock(read(file))).toMatch(/\bvariantGroupId\b/);
  });

  it('the rich-text product block: its own query, and the mapping into ProductData', () => {
    const text = read(path.join(dist, 'components/common/Editor.js'));
    const query = text.slice(text.indexOf('query ProductListBlockProducts'), text.indexOf('inventory', text.indexOf('query ProductListBlockProducts')));
    expect(query).toMatch(/\bvariantGroupId\b/);
    expect(text).toMatch(/variantGroupId:\s*p\.variantGroupId/);
  });

  it('the cart-page shelf: the query it refreshes with after the cart changes', () => {
    const text = read(path.join(dist, 'modules/catalog/components/CartFrequentlyBoughtTogether.js'));
    const start = text.indexOf('crossSellProducts(limit: $limit) {');
    expect(start).toBeGreaterThan(-1);
    expect(text.slice(start, text.indexOf('inventory', start))).toMatch(/\bvariantGroupId\b/);
  });
});
