import { SearchProducts } from '@components/frontStore/catalog/SearchProducts.js';
import React from 'react';

/**
 * Search page block: the result grid (with its `searchProductsBefore` / `searchProductsAfter` Areas). A page component rather than markup inside the `SearchPage` shell so a theme can move it from
 * `layouts.json`; it reads `SearchProvider`, so it must stay inside the search shell's Areas.
 */
export default function SearchProductsBlock(): React.ReactElement | null {
  return <SearchProducts />;
}

export const layout = {
  areaId: 'searchPageContent',
  sortOrder: 20
};
