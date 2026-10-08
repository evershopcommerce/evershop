import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import { ShareButtons } from '@components/frontStore/blog/ShareButtons.js';
import React from 'react';

/**
 * Blog post block: the share buttons. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostShare(): React.ReactElement | null {
  const post = useBlogPost();
  return <ShareButtons url={post.url} title={post.name} />;
}

export const layout = {
  areaId: 'blogPostArticle',
  sortOrder: 60
};
