import { select } from '@evershop/postgres-query-builder';

export const getCouponsBaseQuery = () => {
  const query = select().from('coupon');

  return query;
};
