import { CategoryProductsFilter } from '@components/frontStore/catalog/CategoryProductsFilter.js';
import React from 'react';

/**
 * Category page block: the filter navigation. A page component rather than an inline entry of the
 * `CategoryView` shell so a theme can move it from `layouts.json`. It reads `CategoryProvider`,
 * so it must stay inside the category page shell's Areas; placed elsewhere it throws.
 */
export default function CategoryFilterBlock(): React.ReactElement {
  return <CategoryProductsFilter />;
}

export const layout = {
  areaId: 'categoryLeftColumn',
  sortOrder: 10
};
