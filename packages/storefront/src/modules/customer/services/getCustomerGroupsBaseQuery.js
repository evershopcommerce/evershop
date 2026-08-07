import { select } from '@storefront/postgres-query-builder';

export const getCustomerGroupsBaseQuery = () => {
  const query = select().from('customer_group');

  return query;
};
