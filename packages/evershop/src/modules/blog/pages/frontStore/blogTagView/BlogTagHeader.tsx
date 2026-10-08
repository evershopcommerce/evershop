import { useBlogList } from '@components/frontStore/blog/BlogListContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Blog tag block: the "Tag" label and the tag name. A page component rather than markup inside the shell so a theme can move it from `layouts.json`;
 * it reads `BlogListProvider`, so it must stay inside the listing shell's Areas.
 */
export default function BlogTagHeader(): React.ReactElement | null {
  const { name } = useBlogList();
  return (
    <>
      <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">
        {_('Tag')}
      </p>
      <h1 className="text-3xl font-bold mb-6">#{name}</h1>
    </>
  );
}

export const layout = {
  areaId: 'blogListHeader',
  sortOrder: 10
};
