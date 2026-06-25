import { BlogPagination } from '@components/frontStore/blog/BlogPagination.js';
import {
  BlogPostCardData,
  PostListItem
} from '@components/frontStore/blog/PostListItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogCategoryView({
  category
}: {
  category?: {
    name: string;
    shortDescription?: string | null;
    posts?: {
      items?: BlogPostCardData[];
      total?: number;
      currentPage?: number;
    };
  } | null;
}) {
  if (!category) {
    return null;
  }
  const items = category.posts?.items || [];
  return (
    <div className="blog-category page-width py-8">
      <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
      {category.shortDescription && (
        <p className="text-gray-600 mb-6">{category.shortDescription}</p>
      )}
      {items.length === 0 ? (
        <p className="text-gray-500">{_('No posts in this category yet.')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((post) => (
              <PostListItem key={post.uuid} post={post} />
            ))}
          </div>
          <BlogPagination
            total={category.posts?.total || 0}
            currentPage={category.posts?.currentPage || 1}
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
    category: currentBlogCategory {
      name
      shortDescription
      posts(filters: $filters) {
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
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;
