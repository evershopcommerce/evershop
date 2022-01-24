const { assign } = require("../../../../../lib/util/assign");
const config = require("config");

module.exports = (request, response, stack) => {
    /* Get the list of status */
    assign(response.context, { paymentStatus: config.get('order.paymentStatus') });
    assign(response.context, { shipmentStatus: config.get('order.shipmentStatus') });
}