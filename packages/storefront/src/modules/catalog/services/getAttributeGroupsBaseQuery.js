import { select } from '@storefront/postgres-query-builder';

export const getAttributeGroupsBaseQuery = () =>
  select().from('attribute_group');
