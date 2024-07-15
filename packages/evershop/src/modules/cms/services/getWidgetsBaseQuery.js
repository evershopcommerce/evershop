const { select } = require('@evershop/postgres-query-builder');

module.exports.getWidgetsBaseQuery = () => {
  const query = select().from('widget');

  return query;
};
