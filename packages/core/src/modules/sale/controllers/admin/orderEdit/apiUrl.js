const { assign } = require('../../../../../lib/util/assign');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = (request, response) => {
  /* Get the list of status */
  assign(response.context, { createShipmentUrl: buildUrl('createShipment', { orderId: request.params.id }) });
  assign(response.context, { updateShipmentUrl: buildUrl('updateShipment', { orderId: request.params.id }) });
};
