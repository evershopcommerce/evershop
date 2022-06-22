const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

module.exports = async (request, response, stack, next) => {
  if (!request.body.sku) {
    response.status(500).json({
      success: false,
      message: 'Sku is required'
    });
    return;
  }

  if (!request.body.group_id) {
    response.status(500).json({
      success: false,
      message: 'Attribute group is required'
    });
    return;
  }

  if (!await select().from('attribute_group').where('attribute_group_id', '=', request.body.group_id).load(pool)) {
    response.status(500).json({
      success: false,
      message: `Attribute group id ${request.body.group_id} is not existed`
    });
    return;
  }
  return next();
};
