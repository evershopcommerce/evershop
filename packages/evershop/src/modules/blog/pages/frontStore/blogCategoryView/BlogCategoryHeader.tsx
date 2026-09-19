import { useBlogList } from '@components/frontStore/blog/BlogListContext.js';
import React from 'react';

/**
 * Blog category block: the category name and short description. A page component rather than markup inside the shell so a theme can move it from `layouts.json`;
 * it reads `BlogListProvider`, so it must stay inside the listing shell's Areas.
 */
export default function BlogCategoryHeader(): React.ReactElement | null {
  const { name, description } = useBlogList();
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">{name}</h1>
      {description && <p className="text-muted-foreground mb-6">{description}</p>}
    </>
  );
}

export const layout = {
  areaId: 'blogListHeader',
  sortOrder: 10
};
