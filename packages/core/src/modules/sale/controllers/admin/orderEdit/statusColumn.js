const config = require('config');
const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response) => {
  /* Get the list of status */
  assign(response.context, { paymentStatus: config.get('order.paymentStatus') });
  assign(response.context, { shipmentStatus: config.get('order.shipmentStatus') });
};
