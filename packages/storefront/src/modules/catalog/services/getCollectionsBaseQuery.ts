import { select } from '@storefront/postgres-query-builder';
import type { SelectQuery } from '@storefront/postgres-query-builder';

export const getCollectionsBaseQuery = (): SelectQuery => {
  const query = select().from('collection');
  return query;
};
