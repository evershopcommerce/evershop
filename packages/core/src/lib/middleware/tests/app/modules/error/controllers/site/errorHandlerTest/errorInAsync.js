const { insert } = require('@evershop/mysql-query-builder');
const { getConnection } = require('../../../../../../../../mysql/connection');

module.exports = async (request, response, stack) => {
  const result = await insert('coupon_json').given({ a: 1, b: 2 }).execute(await getConnection());

  return result;
};
