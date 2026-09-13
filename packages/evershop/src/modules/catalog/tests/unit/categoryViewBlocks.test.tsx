import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../../../../components/common/context/app.js';
import {
  CategoryData,
  CategoryProvider
} from '../../../../components/frontStore/catalog/CategoryContext.js';
import CategoryFilter, { layout as filterLayout } from '../../pages/frontStore/categoryView/CategoryFilter.js';
import CategoryInfo, { layout as infoLayout } from '../../pages/frontStore/categoryView/CategoryInfo.js';
import CategoryPagination, { layout as paginationLayout } from '../../pages/frontStore/categoryView/CategoryPagination.js';
import CategoryProducts, { layout as productsLayout } from '../../pages/frontStore/categoryView/CategoryProducts.js';
import CategorySorting, { layout as sortingLayout } from '../../pages/frontStore/categoryView/CategorySorting.js';

// The category page shell (CategoryView.tsx) owns the query, the provider and the
// Areas; these blocks register into the Areas so `themes/<id>/layouts.json` can
// move them without a fork of the shell.
const category = {
  name: 'Women',
  description: [],
  image: null,
  showProducts: true,
  products: { items: [], total: 3, currentFilters: [] }
} as unknown as CategoryData;

const appState = {
  config: { pageMeta: { route: { id: 'categoryView' } } },
  widgets: []
} as unknown as React.ComponentProps<typeof AppProvider>['value'];

const inShell = (el: React.ReactElement) =>
  renderToStaticMarkup(
    <AppProvider value={appState}>
      <CategoryProvider category={category}>{el}</CategoryProvider>
    </AppProvider>
  );
const outsideShell = (el: React.ReactElement) =>
  renderToStaticMarkup(<AppProvider value={appState}>{el}</AppProvider>);

describe('category page blocks', () => {
  it('keep the default slots the shell had when the pieces were inline', () => {
    expect(infoLayout).toEqual({ areaId: 'categoryInfo', sortOrder: 10 });
    expect(filterLayout).toEqual({ areaId: 'categoryLeftColumn', sortOrder: 10 });
    expect(sortingLayout).toEqual({ areaId: 'categoryRightColumn', sortOrder: 10 });
    expect(productsLayout).toEqual({ areaId: 'categoryRightColumn', sortOrder: 20 });
    expect(paginationLayout).toEqual({ areaId: 'categoryRightColumn', sortOrder: 30 });
  });

  it('render the shared components from the category context, without props', () => {
    const info = inShell(<CategoryInfo />);
    expect(info).toContain('category__general');
    expect(info).toContain('Women');
    expect(inShell(<CategorySorting />).length).toBeGreaterThan(0);
    expect(() => inShell(<CategoryPagination />)).not.toThrow();
  });

  it('throw outside the shell, so a wrong layouts.json placement fails loudly for the developer', () => {
    for (const el of [<CategoryInfo />, <CategoryFilter />, <CategorySorting />, <CategoryProducts />, <CategoryPagination />]) {
      expect(() => outsideShell(el)).toThrow('within a CategoryProvider');
    }
  });
});
