import { select } from '@storefront/postgres-query-builder';

export const getAttributesBaseQuery = () => select().from('attribute');
