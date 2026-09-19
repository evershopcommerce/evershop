import Area from '@components/common/Area.js';
import { BlogListProvider } from '@components/frontStore/blog/BlogListContext.js';
import { BlogPostCardData } from '@components/frontStore/blog/PostListItem.js';
import React from 'react';

/**
 * Blog home shell. It owns the query, the `BlogListProvider` and the slots
 * (Areas); the content is page blocks registering into those slots, so a
 * theme can re-position them from `layouts.json` without overriding this file.
 * `BlogPosts` and `BlogListPagination` are shared with the category and tag
 * listings (`blogHome+blogCategoryView+blogTagView` folder):
 *
 *   blogHome/BlogHomeHeader                                   → blogListHeader  10
 *   blogHome+blogCategoryView+blogTagView/BlogPosts           → blogListContent 10
 *   blogHome+blogCategoryView+blogTagView/BlogListPagination  → blogListContent 20
 *
 * `blogListTop` / `blogListBottom` are empty slots for extensions and widgets.
 */
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
    <BlogListProvider list={{ kind: 'home', items, total: blogPosts?.total || 0, currentPage }}>
      <div className="blog-home py-8 md:py-12">
        <Area id="blogListTop" noOuter />
        <Area id="blogListHeader" noOuter />
        <Area id="blogListContent" noOuter />
        <Area id="blogListBottom" noOuter />
      </div>
    </BlogListProvider>
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
