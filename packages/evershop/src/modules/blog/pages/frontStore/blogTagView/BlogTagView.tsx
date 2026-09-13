import Area from '@components/common/Area.js';
import { BlogListProvider } from '@components/frontStore/blog/BlogListContext.js';
import { BlogPostCardData } from '@components/frontStore/blog/PostListItem.js';
import React from 'react';

/**
 * Blog tag shell: same slots as the blog home (see `BlogHome.tsx`); the header
 * is this route's own block, the list and pagination are shared:
 *
 *   blogTagView/BlogTagHeader                                 → blogListHeader  10
 *   blogHome+blogCategoryView+blogTagView/BlogPosts           → blogListContent 10
 *   blogHome+blogCategoryView+blogTagView/BlogListPagination  → blogListContent 20
 */
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
    <BlogListProvider
      list={{
        kind: 'tag',
        name: tag.name,
        items,
        total: tag.posts?.total || 0,
        currentPage: tag.posts?.currentPage || 1
      }}
    >
      <div className="blog-tag py-8">
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
