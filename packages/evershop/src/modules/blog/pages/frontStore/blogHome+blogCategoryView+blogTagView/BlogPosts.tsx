import { useBlogList } from '@components/frontStore/blog/BlogListContext.js';
import { PostListItem } from '@components/frontStore/blog/PostListItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Blog listing block: the post grid, or the empty message, shared by the blog
 * home, category and tag pages (`blogHome+blogCategoryView+blogTagView`
 * folder, so one override or one `layouts.json` entry covers all three). A
 * page component rather than markup inside the shells so a theme can move it
 * from `layouts.json`; it reads `BlogListProvider`, so it must stay inside a
 * listing shell's Areas.
 */
const EMPTY = {
  home: 'No posts published yet.',
  category: 'No posts in this category yet.',
  tag: 'No posts with this tag yet.'
} as const;

export default function BlogPosts(): React.ReactElement {
  const { kind, items } = useBlogList();
  if (items.length === 0) {
    return (
      <p className={kind === 'home' ? 'text-center text-muted-foreground' : 'text-muted-foreground'}>
        {_(EMPTY[kind])}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((post) => (
        <PostListItem key={post.uuid} post={post} />
      ))}
    </div>
  );
}

export const layout = {
  areaId: 'blogListContent',
  sortOrder: 10
};
