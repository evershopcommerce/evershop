import { select } from '@evershop/postgres-query-builder';

export const getCustomerGroupsBaseQuery = () => {
  const query = select().from('customer_group');

  return query;
};
