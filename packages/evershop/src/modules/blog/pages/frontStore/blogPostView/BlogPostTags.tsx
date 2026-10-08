import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Blog post block: the tag chips, when the post has tags. A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostTags(): React.ReactElement | null {
  const post = useBlogPost();
  return post.tags && post.tags.length > 0 ? (
    <div className="mt-10 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{_('Tags')}:</span>
      {post.tags.map((tag) => (
        <a
          key={tag.url}
          href={tag.url}
          className="rounded-full bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted/70"
        >
          #{tag.name}
        </a>
      ))}
    </div>
  ) : null;
}

export const layout = {
  areaId: 'blogPostArticle',
  sortOrder: 40
};
