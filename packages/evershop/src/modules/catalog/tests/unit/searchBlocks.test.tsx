import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../../../../components/common/context/app.js';
import { SearchPageData, SearchProvider } from '../../../../components/frontStore/catalog/SearchContext.js';
import SearchInfo, { layout as infoLayout } from '../../pages/frontStore/catalogSearch/SearchInfo.js';
import SearchProducts, { layout as productsLayout } from '../../pages/frontStore/catalogSearch/SearchProducts.js';

// The search shell owns the query, the provider and the Areas; these blocks
// register into the Areas so `themes/<id>/layouts.json` can move them.
const search = { keyword: 'linen', products: { items: [], total: 0, currentFilters: [] } } as unknown as SearchPageData;
const appState = { config: { pageMeta: { route: { id: 'catalogSearch' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<
  typeof AppProvider
>['value'];
const inShell = (el: React.ReactElement) =>
  renderToStaticMarkup(
    <AppProvider value={appState}>
      <SearchProvider searchData={search}>{el}</SearchProvider>
    </AppProvider>
  );

describe('search page blocks', () => {
  it('keep the default slots and order the shell had when the pieces were inline', () => {
    expect(infoLayout).toEqual({ areaId: 'searchPageContent', sortOrder: 10 });
    expect(productsLayout).toEqual({ areaId: 'searchPageContent', sortOrder: 20 });
  });

  it('render from the search context, without props', () => {
    expect(inShell(<SearchInfo />)).toContain('linen');
    expect(() => inShell(<SearchProducts />)).not.toThrow();
  });

  it('throw outside the search shell, so a wrong layouts.json placement fails loudly', () => {
    expect(() => renderToStaticMarkup(<AppProvider value={appState}><SearchInfo /></AppProvider>)).toThrow('within a SearchProvider');
  });
});
