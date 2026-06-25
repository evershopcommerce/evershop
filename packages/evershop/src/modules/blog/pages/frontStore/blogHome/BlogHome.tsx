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
  return (
    <div className="blog-home page-width py-8">
      <h1 className="text-3xl font-bold mb-6">{_('Blog')}</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">{_('No posts published yet.')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((post) => (
              <PostListItem key={post.uuid} post={post} />
            ))}
          </div>
          <BlogPagination
            total={blogPosts?.total || 0}
            currentPage={blogPosts?.currentPage || 1}
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
