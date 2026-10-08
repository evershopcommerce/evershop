import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import { CommentSection } from '@components/frontStore/blog/CommentSection.js';
import React from 'react';

/**
 * Blog post block: the comment section. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostComments(): React.ReactElement | null {
  const post = useBlogPost();
  return (
    <CommentSection
      postUuid={post.uuid}
      comments={post.comments}
      commentPolicy={post.category?.commentPolicy}
    />
  );
}

export const layout = {
  areaId: 'blogPostBottom',
  sortOrder: 20
};
