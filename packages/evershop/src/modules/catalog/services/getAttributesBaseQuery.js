import { select } from '@evershop/postgres-query-builder';

export const getAttributesBaseQuery = () => select().from('attribute');
