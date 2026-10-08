import { useBlogList } from '@components/frontStore/blog/BlogListContext.js';
import { BlogPagination } from '@components/frontStore/blog/BlogPagination.js';
import React from 'react';

/**
 * Blog listing block: the pagination, shared by the blog home, category and
 * tag pages (`blogHome+blogCategoryView+blogTagView` folder). Renders nothing
 * when the list is empty. A page component rather than markup inside the
 * shells so a theme can move it from `layouts.json`; it reads
 * `BlogListProvider`, so it must stay inside a listing shell's Areas.
 */
export default function BlogListPagination(): React.ReactElement | null {
  const { items, total, currentPage } = useBlogList();
  if (items.length === 0) return null;
  return <BlogPagination total={total} currentPage={currentPage} />;
}

export const layout = {
  areaId: 'blogListContent',
  sortOrder: 20
};
