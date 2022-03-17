const config = require('config');
const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  /* Get the list of status */
  assign(response.context, { paymentStatus: config.get('order.paymentStatus') });

  // Handle filter
  if (request.query.payment_status) {
    const query = stack.queryInit;
    query.andWhere('`order`.`payment_status`', '=', request.query.payment_status);
    assign(response.context, {
      grid: { currentFilter: { payment_status: request.query.payment_status } }
    });
  }
};
