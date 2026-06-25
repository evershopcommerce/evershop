export function registerDefaultBlogCommentFilters() {
  return [
    {
      key: 'status',
      operation: ['eq'],
      callback: (
        query: any,
        operation: string,
        value: any,
        currentFilters: any[]
      ) => {
        query.andWhere('blog_comment.status', '=', value);
        currentFilters.push({ key: 'status', operation, value });
      }
    },
    {
      key: 'keyword',
      operation: ['eq', 'like'],
      callback: (
        query: any,
        operation: string,
        value: any,
        currentFilters: any[]
      ) => {
        query.andWhere('blog_comment.comment', 'ilike', `%${value}%`);
        currentFilters.push({ key: 'keyword', operation, value });
      }
    }
  ];
}
