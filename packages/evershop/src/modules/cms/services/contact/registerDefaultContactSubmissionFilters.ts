/**
 * Filters for the admin contact-messages grid. Mirrors
 * `registerDefaultBlogCommentFilters` — the `*` catch-all and pagination come
 * from `defaultPaginationFilters`, registered after these in bootstrap.
 */
export function registerDefaultContactSubmissionFilters() {
  return [
    {
      key: 'status',
      operation: ['eq'],
      callback: (
        query: any,
        operation: string,
        value: string,
        currentFilters: Array<Record<string, unknown>>
      ) => {
        query.andWhere('contact_submission.status', '=', value);
        currentFilters.push({ key: 'status', operation, value });
      }
    },
    {
      key: 'keyword',
      operation: ['eq', 'like'],
      callback: (
        query: any,
        operation: string,
        value: string,
        currentFilters: Array<Record<string, unknown>>
      ) => {
        // Search across who sent it and what they said — the two things an
        // operator actually looks for.
        query
          .andWhere('contact_submission.name', 'ilike', `%${value}%`)
          .or('contact_submission.email', 'ilike', `%${value}%`)
          .or('contact_submission.message', 'ilike', `%${value}%`);
        currentFilters.push({ key: 'keyword', operation, value });
      }
    }
  ];
}
