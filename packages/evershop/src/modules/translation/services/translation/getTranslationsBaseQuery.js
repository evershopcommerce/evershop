const { select } = require('@evershop/postgres-query-builder');

module.exports.getTranslationsBaseQuery = () => {
  const query = select().from('translation');
  return query;
};
