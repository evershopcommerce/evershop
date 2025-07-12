import { select } from '@evershop/postgres-query-builder';
import type { SelectQuery } from '@evershop/postgres-query-builder';

export const getCollectionsBaseQuery = (): SelectQuery => {
  const query = select().from('collection');
  return query;
};
