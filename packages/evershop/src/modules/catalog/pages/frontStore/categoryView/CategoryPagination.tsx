import { CategoryProductsPagination } from '@components/frontStore/catalog/CategoryProductsPagination.js';
import React from 'react';

/**
 * Category page block: the pagination. A page component rather than an inline entry of the
 * `CategoryView` shell so a theme can move it from `layouts.json`. It reads `CategoryProvider`,
 * so it must stay inside the category page shell's Areas; placed elsewhere it throws.
 */
export default function CategoryPaginationBlock(): React.ReactElement {
  return <CategoryProductsPagination />;
}

export const layout = {
  areaId: 'categoryRightColumn',
  sortOrder: 30
};
