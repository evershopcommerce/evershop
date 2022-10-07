const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  response.json({
    success: true,
    data: await select().from('coupon').execute(pool)
  })
};
