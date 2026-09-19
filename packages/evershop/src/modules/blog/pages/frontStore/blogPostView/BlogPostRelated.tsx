import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import { PostListItem } from '@components/frontStore/blog/PostListItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Blog post block: the related posts, when there are any. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostRelated(): React.ReactElement | null {
  const post = useBlogPost();
  return post.related && post.related.length > 0 ? (
    <div className="mx-auto max-w-5xl pb-4 pt-12">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">
        {_('Related posts')}
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {post.related.map((related) => (
          <PostListItem key={related.uuid} post={related} />
        ))}
      </div>
    </div>
  ) : null;
}

export const layout = {
  areaId: 'blogPostBottom',
  sortOrder: 10
};
