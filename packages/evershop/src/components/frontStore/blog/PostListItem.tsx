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

/**
 * A blog post card used in the index / category / tag listings.
 */
export function PostListItem({ post }: { post: BlogPostCardData }) {
  return (
    <article className="blog-post-card flex flex-col">
      {post.thumbnail && (
        <a
          href={post.url}
          className="block mb-3 overflow-hidden rounded-lg"
        >
          <img
            src={post.thumbnail}
            alt={post.name}
            className="w-full h-48 object-cover"
          />
        </a>
      )}
      <h2 className="text-xl font-semibold mb-1 leading-snug">
        <a href={post.url} className="hover:underline">
          {post.name}
        </a>
      </h2>
      <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 mb-2">
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
      {post.shortDescription && (
        <p className="text-gray-700 mb-2">{post.shortDescription}</p>
      )}
      <a href={post.url} className="font-medium hover:underline mt-auto">
        {_('Read more')} →
      </a>
    </article>
  );
}
