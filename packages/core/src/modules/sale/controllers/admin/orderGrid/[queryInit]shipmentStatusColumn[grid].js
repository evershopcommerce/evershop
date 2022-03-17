const config = require('config');
const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response, stack) => {
  /* Get the list of status */
  assign(response.context, { shipmentStatus: config.get('order.shipmentStatus') });

  // Handle filter
  if (request.query.shipment_status) {
    const query = stack.queryInit;
    query.andWhere('`order`.`shipment_status`', '=', request.query.shipment_status);
    assign(response.context, {
      grid: { currentFilter: { shipment_status: request.query.shipment_status } }
    });
  }
};
