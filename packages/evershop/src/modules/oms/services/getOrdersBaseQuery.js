import { select } from '@evershop/postgres-query-builder';

export const getOrdersBaseQuery = () => {
  const query = select().from('order');

  return query;
};
