const { select } = require('@nodejscart/mysql-query-builder');

module.exports = function (request, response) {
  const query = select('*').from('attribute');

  return query;
};
