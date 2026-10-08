import { useCategory } from '@components/frontStore/catalog/CategoryContext.js';
import { ProductSorting } from '@components/frontStore/catalog/ProductSorting.js';
import React from 'react';

/**
 * Category page block: the sort control with the product count. A page
 * component rather than an inline entry of the `CategoryView` shell so a
 * theme can move it from `layouts.json`. It reads `CategoryProvider`, so it
 * must stay inside the category page shell's Areas; placed elsewhere it throws.
 */
export default function CategorySortingBlock(): React.ReactElement {
  const { products } = useCategory();
  return <ProductSorting className="flex justify-start" count={products.total} />;
}

export const layout = {
  areaId: 'categoryRightColumn',
  sortOrder: 10
};
