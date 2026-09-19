import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export interface BlogPostCardData {
  uuid: string;
  name: string;
  url: string;
  shortDescription?: string | null;
  thumbnail?: string | null;
  publishedAt?: string | null;
  readingTime?: number | null;
  author?: { fullName?: string | null } | null;
}

/** Author · date · reading-time meta row, shared by the card + featured post. */
export function PostMeta({
  post,
  className = ''
}: {
  post: BlogPostCardData;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground ${className}`}
    >
      {post.author?.fullName && <span>{post.author.fullName}</span>}
      {post.publishedAt && (
        <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
      )}
      {post.readingTime ? (
        <span>
          {post.readingTime} {_('min read')}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A blog post card used in the index / category / tag listings.
 */
export function PostListItem({ post }: { post: BlogPostCardData }) {
  return (
    <article className="blog-post-card flex flex-col">
      {post.thumbnail && (
        <a
          href={post.url}
          className="mb-4 block aspect-[16/10] overflow-hidden rounded-lg border border-border"
        >
          <img
            src={post.thumbnail}
            alt={post.name}
            className="h-full w-full object-cover"
          />
        </a>
      )}
      <h2 className="mb-2 text-xl font-semibold leading-snug tracking-tight">
        <a href={post.url} className="hover:underline">
          {post.name}
        </a>
      </h2>
      <PostMeta post={post} className="mb-3" />
      {post.shortDescription && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          {post.shortDescription}
        </p>
      )}
      <a
        href={post.url}
        className="mt-auto text-sm font-medium text-foreground hover:underline"
      >
        {_('Read more')} →
      </a>
    </article>
  );
}
