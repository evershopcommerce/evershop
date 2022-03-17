const { select } = require('@nodejscart/mysql-query-builder');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response) => {
  const query = select('*').from('order');

  return query;
};
