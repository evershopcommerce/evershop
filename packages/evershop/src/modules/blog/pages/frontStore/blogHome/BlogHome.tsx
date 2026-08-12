import { BlogPagination } from '@components/frontStore/blog/BlogPagination.js';
import {
  BlogPostCardData,
  PostListItem
} from '@components/frontStore/blog/PostListItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogHome({
  blogPosts
}: {
  blogPosts?: {
    items?: BlogPostCardData[];
    total?: number;
    currentPage?: number;
  };
}) {
  const items = blogPosts?.items || [];
  const currentPage = blogPosts?.currentPage || 1;

  return (
    <div className="blog-home py-8 md:py-12">
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {_('Blog')}
        </h1>
      </div>
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {_('No posts published yet.')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => (
              <PostListItem key={post.uuid} post={post} />
            ))}
          </div>
          <BlogPagination
            total={blogPosts?.total || 0}
            currentPage={currentPage}
          />
        </>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query($filters: [FilterInput]) {
    blogPosts(filters: $filters) {
      items {
        uuid
        name
        url
        shortDescription
        thumbnail
        publishedAt
        readingTime
        author {
          fullName
        }
      }
      total
      currentPage
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
