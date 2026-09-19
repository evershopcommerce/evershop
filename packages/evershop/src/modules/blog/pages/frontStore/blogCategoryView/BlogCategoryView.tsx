import Area from '@components/common/Area.js';
import { BlogListProvider } from '@components/frontStore/blog/BlogListContext.js';
import { BlogPostCardData } from '@components/frontStore/blog/PostListItem.js';
import React from 'react';

/**
 * Blog category shell: same slots as the blog home (see `BlogHome.tsx`); the
 * header is this route's own block, the list and pagination are shared:
 *
 *   blogCategoryView/BlogCategoryHeader                       → blogListHeader  10
 *   blogHome+blogCategoryView+blogTagView/BlogPosts           → blogListContent 10
 *   blogHome+blogCategoryView+blogTagView/BlogListPagination  → blogListContent 20
 */
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
    <BlogListProvider
      list={{
        kind: 'category',
        name: category.name,
        description: category.shortDescription,
        items,
        total: category.posts?.total || 0,
        currentPage: category.posts?.currentPage || 1
      }}
    >
      <div className="blog-category py-8">
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
    category: currentBlogCategory {
      uuid
      metafields {
        namespace
        key
        type
        value
      }
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
