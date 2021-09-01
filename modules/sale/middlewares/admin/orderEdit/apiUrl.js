const { assign } = require("../../../../../lib/util/assign");
const { buildAdminUrl } = require('../../../../../lib/routie');

module.exports = (request, response, stack) => {
    /* Get the list of status */
    assign(response.context, { createShipmentUrl: buildAdminUrl('createShipment', { orderId: request.params.id }) });
}