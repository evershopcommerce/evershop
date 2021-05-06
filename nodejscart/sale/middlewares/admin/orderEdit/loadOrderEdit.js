const { select } = require('../../../../../lib/mysql/query')
import { pool } from '../../../../../lib/mysql/connection';
const { buildAdminUrl } = require('../../../../../lib/routie');
import { assign } from "../../../../../lib/util/assign";
const config = require("config");

module.exports = async (request, response, stack, next) => {
    let query = select();
    query.from("order");
    query.where("order_id", "=", request.params.id);
    let order = await query.load(pool);
    if (order === null) {
        request.session.notifications = request.session.notifications || [];
        request.session.notifications.push({
            type: "error",
            message: "Requested order does not exist"
        });
        request.session.save();
        response.redirect(302, buildAdminUrl("orderGrid"));
    } else {
        // Order status
        let shipmentStatus = config.get("order.shipmentStatus");
        let paymentStatus = config.get("order.shipmentStatus");
        order.shipmentStatus = shipmentStatus.find((s) => s.code === order.shipment_status);
        if (order.shipmentStatus === undefined)
            order.shipmentStatus = {
                name: `Status deprecated(${order.shipment_status})`,
                code: order.shipment_status,
                badge: ""
            }
        order.paymentStatus = paymentStatus.find((s) => s.code === order.payment_status);
        if (order.paymentStatus === undefined)
            order.paymentStatus = {
                name: `Status deprecated(${order.payment_status})`,
                code: order.payment_status,
                badge: ""
            }
        assign(response.context, { order: JSON.parse(JSON.stringify(order)) });
        next();
    }
}