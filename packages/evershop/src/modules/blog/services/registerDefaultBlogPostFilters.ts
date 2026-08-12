import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';

/**
 * Default filter set for the blog_post collection (spec §5). Each entry mutates
 * the SelectQuery and records the applied filter in `currentFilters`.
 */
export function registerDefaultBlogPostFilters() {
  return [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        if (operation === 'eq') {
          query.andWhere('blog_post_description.name', '=', value);
        } else {
          query.andWhere('blog_post_description.name', 'ilike', `%${value}%`);
        }
        currentFilters.push({ key: 'name', operation, value });
      }
    },
    {
      key: 'keyword',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        query.andWhere('blog_post_description.name', 'ilike', `%${value}%`);
        currentFilters.push({ key: 'keyword', operation, value });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        query.andWhere('blog_post.status', OPERATION_MAP[operation], value);
        currentFilters.push({ key: 'status', operation, value });
      }
    },
    {
      key: 'category',
      operation: ['eq', 'in'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        if (operation === 'in') {
          query.andWhere('blog_post.category_id', 'IN', String(value).split(','));
        } else {
          query.andWhere('blog_post.category_id', '=', value);
        }
        currentFilters.push({ key: 'category', operation, value });
      }
    },
    {
      key: 'tag',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        query
          .leftJoin('blog_post_tag')
          .on('blog_post_tag.post_id', '=', 'blog_post.blog_post_id');
        query.andWhere('blog_post_tag.tag_id', '=', value);
        currentFilters.push({ key: 'tag', operation, value });
      }
    },
    {
      key: 'ob',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        const columns: Record<string, string> = {
          name: 'blog_post_description.name',
          published_at: 'blog_post.published_at',
          created_at: 'blog_post.created_at'
        };
        query.orderBy(columns[value] || 'blog_post.published_at');
        currentFilters.push({ key: 'ob', operation, value });
      }
    }
  ];
}
