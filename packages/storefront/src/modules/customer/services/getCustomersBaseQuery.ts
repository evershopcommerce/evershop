import { select, SelectQuery } from '@storefront/postgres-query-builder';

export const getCustomersBaseQuery = (): SelectQuery => {
  const query = select().from('customer');

  return query;
};
