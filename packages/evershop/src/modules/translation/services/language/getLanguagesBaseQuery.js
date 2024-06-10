const { select } = require('@evershop/postgres-query-builder');

module.exports.getLanguagesBaseQuery = () => {
  const query = select().from('language');
  return query;
};
