import { select, SelectQuery } from '@evershop/postgres-query-builder';

export const getCustomersBaseQuery = (): SelectQuery => {
  const query = select().from('customer');

  return query;
};
