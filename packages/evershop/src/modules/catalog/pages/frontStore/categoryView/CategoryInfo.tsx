import { CategoryInfo } from '@components/frontStore/catalog/CategoryInfo.js';
import React from 'react';

/**
 * Category page block: name, description and image. A page component rather than an inline entry of the
 * `CategoryView` shell so a theme can move it from `layouts.json`. It reads `CategoryProvider`,
 * so it must stay inside the category page shell's Areas; placed elsewhere it throws.
 */
export default function CategoryInfoBlock(): React.ReactElement {
  return <CategoryInfo />;
}

export const layout = {
  areaId: 'categoryInfo',
  sortOrder: 10
};
