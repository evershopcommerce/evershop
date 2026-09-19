import { OPERATION_MAP } from '../../../lib/util/filterOperationMap.js';

export function registerDefaultBlogCategoryFilters() {
  return [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        if (operation === 'eq') {
          query.andWhere('blog_category_description.name', '=', value);
        } else {
          query.andWhere('blog_category_description.name', 'ilike', `%${value}%`);
        }
        currentFilters.push({ key: 'name', operation, value });
      }
    },
    {
      key: 'status',
      operation: ['eq'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        query.andWhere('blog_category.status', OPERATION_MAP[operation], value);
        currentFilters.push({ key: 'status', operation, value });
      }
    }
  ];
}
