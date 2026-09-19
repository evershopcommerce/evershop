import { select } from '@evershop/postgres-query-builder';

export const getWidgetsBaseQuery = () => {
  // Renamed in cms migration 1.3.0: widget → widget_instance.
  const query = select().from('widget_instance');

  return query;
};
