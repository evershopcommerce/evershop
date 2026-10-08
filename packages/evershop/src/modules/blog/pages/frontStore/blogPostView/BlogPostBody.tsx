import { Editor } from '@components/common/Editor.js';
import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import React from 'react';

/**
 * Blog post block: the post content. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostBody(): React.ReactElement | null {
  const post = useBlogPost();
  return (
    <div className="mt-8">
      <Editor rows={post.description || []} />
    </div>
  );
}

export const layout = {
  areaId: 'blogPostArticle',
  sortOrder: 30
};
