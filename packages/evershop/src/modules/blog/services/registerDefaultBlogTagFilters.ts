export function registerDefaultBlogTagFilters() {
  return [
    {
      key: 'name',
      operation: ['eq', 'like'],
      callback: (query: any, operation: string, value: any, currentFilters: any[]) => {
        if (operation === 'eq') {
          query.andWhere('blog_tag.name', '=', value);
        } else {
          query.andWhere('blog_tag.name', 'ilike', `%${value}%`);
        }
        currentFilters.push({ key: 'name', operation, value });
      }
    }
  ];
}
