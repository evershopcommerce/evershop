const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const orderId = request.params.id;
  const { transactionId, amount } = request.body;

  // Validate the order;
  const order = await select()
    .from('order')
    .where('order_id', '=', orderId)
    .load(pool);

  if (!order) {
    response.json({
      data: {},
      success: false,
      message: 'Requested order does not exist'
    });
  } else {

  }
};
