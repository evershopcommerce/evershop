import { useBlogPost } from '@components/frontStore/blog/BlogPostContext.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import React from 'react';

/**
 * Blog post block: the back link, the category chip, the title and the meta
 * line (author, date, reading time). A page component rather than markup inside the `BlogPostView` shell so a theme can move it
 * from `layouts.json`; it reads `BlogPostProvider`, so it must stay inside the post shell's Areas.
 */
export default function BlogPostHeader(): React.ReactElement {
  const post = useBlogPost();
  return (
    <>
      <div className="mb-8 text-center">
        <a
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {_('Back to blog')}
        </a>
      </div>
      <header className="text-center">
        {post.category && (
          <a
            href={post.category.url}
            className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            {post.category.name}
          </a>
        )}
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
          {post.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {post.author?.fullName && <span>{post.author.fullName}</span>}
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString()}
            </span>
          )}
          {post.readingTime ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readingTime} {_('min read')}
            </span>
          ) : null}
        </div>
      </header>
    </>
  );
}

export const layout = {
  areaId: 'blogPostArticle',
  sortOrder: 10
};
