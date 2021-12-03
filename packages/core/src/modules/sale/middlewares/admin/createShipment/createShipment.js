const { rollback, insert, commit, select, update, startTransaction } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');
const config = require('config');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack, next) => {
    let connection = await getConnection();
    await startTransaction(connection);
    let orderId = request.params.orderId;
    let carrierName = get(request, 'body.carrier_name');
    let trackingNumber = get(request, 'body.tracking_number');
    try {
        let order = await select()
            .from('order')
            .where('order_id', '=', orderId)
            .load(connection);

        if (!order) {
            throw new Error('Requested order does not exist');
        }
        let shipment = await select()
            .from('shipment')
            .where('shipment_order_id', '=', orderId)
            .load(connection);

        if (shipment) {
            throw new Error('Order was fullfilled');
        }
        await insert('shipment')
            .given({
                shipment_order_id: orderId,
                carrier_name: carrierName,
                tracking_number: trackingNumber
            })
            .execute(connection);
        /* Update Shipment status to fullfilled */
        let shipmentStatus = config.get('order.shipmentStatus');
        if (shipmentStatus.find(s => s.code === 'fullfilled')) {
            await update('order')
                .given({ shipment_status: 'fullfilled' })
                .where('order_id', '=', orderId)
                .execute(connection);
        }
        /* Add an activity log message */
        // TODO: This will be improved. It should be treated as a side effect and move to somewhere else
        await insert('order_activity').given({
            order_activity_order_id: orderId,
            comment: "Fullfilled items",
            customer_notified: 0
        }).execute(connection);

        await commit(connection);
        response.json({
            data: {},
            success: true
        })
    } catch (e) {
        await rollback(connection)
        response.json({
            data: {},
            message: e.message,
            success: false
        })
    }
}