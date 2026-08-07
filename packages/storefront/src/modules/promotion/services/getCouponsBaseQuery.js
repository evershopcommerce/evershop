import { select } from '@storefront/postgres-query-builder';

export const getCouponsBaseQuery = () => {
  const query = select().from('coupon');

  return query;
};
