import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import React from 'react';

/**
 * Blog post block: the thumbnail, when the post has one. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostThumbnail(): React.ReactElement | null {
  const post = useBlogPost();
  return post.thumbnail ? (
    <img
      src={post.thumbnail}
      alt={post.name}
      className="mt-8 w-full rounded-lg border border-border"
    />
  ) : null;
}

export const layout = {
  areaId: 'blogPostArticle',
  sortOrder: 20
};
