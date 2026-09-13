import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import { ReactionBar } from '@components/frontStore/blog/ReactionBar.js';
import React from 'react';

/**
 * Blog post block: the reaction bar. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostReactions(): React.ReactElement | null {
  const post = useBlogPost();
  return <ReactionBar postUuid={post.uuid} reactions={post.reactions} />;
}

export const layout = {
  areaId: 'blogPostArticle',
  sortOrder: 50
};
