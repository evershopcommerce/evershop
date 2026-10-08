import { describe, it, expect } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DefaultCategoryFilterRender } from '../../DefaultCategoryFilterRender.js';
import { CategoryFilter, ProductFilterDispatch } from '../../ProductFilter.js';

/**
 * The category facet is fed two different shapes:
 *
 * - the category page passes one level of `children`, with no `depth`;
 * - `/products` passes the whole tree flattened, with a depth per row.
 *
 * Indentation is the only thing that tells a shopper "Kids" sits UNDER
 * "Accessories update here" rather than beside it. Both are valid choices —
 * the `cat` filter matches subtrees — but presenting a child as a sibling is
 * simply wrong.
 */

const render = (categories: CategoryFilter[]) =>
  renderToStaticMarkup(
    <ProductFilterDispatch.Provider value={{ updateFilter: () => undefined }}>
      <DefaultCategoryFilterRender categories={categories} currentFilters={[]} />
    </ProductFilterDispatch.Provider>
  );

const tree: CategoryFilter[] = [
  { categoryId: 50, uuid: 'u50', name: 'Accessories update here', depth: 0 },
  { categoryId: 1, uuid: 'u1', name: 'Kids', depth: 1 },
  { categoryId: 7, uuid: 'u7', name: 'test', depth: 2 },
  { categoryId: 2, uuid: 'u2', name: 'Women', depth: 0 }
];

describe('DefaultCategoryFilterRender indentation', () => {
  it('renders every level of the tree', () => {
    const html = render(tree);
    for (const category of tree) {
      expect(html).toContain(category.name);
    }
  });

  it('indents by depth, so a child does not read as a sibling', () => {
    const html = render(tree);
    expect(html).toContain('padding-inline-start:14px'); // depth 1
    expect(html).toContain('padding-inline-start:28px'); // depth 2
  });

  it('leaves roots unindented rather than emitting a zero offset', () => {
    const html = render([tree[0]]);
    expect(html).not.toContain('padding-inline-start');
  });

  it('renders the category page shape unchanged when depth is absent', () => {
    // One level of `children`, exactly what categoryView passes today.
    const children: CategoryFilter[] = [
      { categoryId: 48, uuid: 'u48', name: 'New Arrivals' },
      { categoryId: 49, uuid: 'u49', name: 'Best Sellers' }
    ];
    const html = render(children);
    expect(html).toContain('New Arrivals');
    expect(html).toContain('Best Sellers');
    expect(html).not.toContain('padding-inline-start');
  });

  it('keeps the section out of the DOM when there is nothing to offer', () => {
    expect(render([])).toBe('');
  });
});
