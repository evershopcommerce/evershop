import { CategoryProducts } from '@components/frontStore/catalog/CategoryProducts.js';
import React from 'react';

/**
 * Category page block: the product list. A page component rather than an inline entry of the
 * `CategoryView` shell so a theme can move it from `layouts.json`. It reads `CategoryProvider`,
 * so it must stay inside the category page shell's Areas; placed elsewhere it throws.
 */
export default function CategoryProductsBlock(): React.ReactElement {
  return <CategoryProducts />;
}

export const layout = {
  areaId: 'categoryRightColumn',
  sortOrder: 20
};
