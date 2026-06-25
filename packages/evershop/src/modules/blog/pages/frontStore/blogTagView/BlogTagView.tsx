import { BlogPagination } from '@components/frontStore/blog/BlogPagination.js';
import {
  BlogPostCardData,
  PostListItem
} from '@components/frontStore/blog/PostListItem.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export default function BlogTagView({
  tag
}: {
  tag?: {
    name: string;
    posts?: {
      items?: BlogPostCardData[];
      total?: number;
      currentPage?: number;
    };
  } | null;
}) {
  if (!tag) {
    return null;
  }
  const items = tag.posts?.items || [];
  return (
    <div className="blog-tag page-width py-8">
      <p className="text-sm uppercase tracking-wide text-gray-500 mb-1">
        {_('Tag')}
      </p>
      <h1 className="text-3xl font-bold mb-6">#{tag.name}</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">{_('No posts with this tag yet.')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((post) => (
              <PostListItem key={post.uuid} post={post} />
            ))}
          </div>
          <BlogPagination
            total={tag.posts?.total || 0}
            currentPage={tag.posts?.currentPage || 1}
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
    tag: currentBlogTag {
      name
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
