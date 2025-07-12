import { select } from '@evershop/postgres-query-builder';

export const getAttributeGroupsBaseQuery = () =>
  select().from('attribute_group');
