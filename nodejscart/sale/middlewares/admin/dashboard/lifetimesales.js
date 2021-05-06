var { select } = require('../../../../../lib/mysql/query')
var { pool } = require('../../../../../lib/mysql/connection');
const { getComponentSource } = require('../../../../../lib/util');

module.exports = async function lifetimeSales(request, response) {
    response.addComponent(
        "lifetimesales",
        "right.side",
        getComponentSource("sale/components/admin/dashboard/lifetimesales.js"),
        {},
        10
    );

    let query = select();
    query.from("order")
        .select("grand_total", "total")
        .select("payment_status")
        .select("shipment_status");
    let results = await query.execute(pool);

    let total = 0, cancelled = 0, completed = 0;
    results.forEach((result) => {
        total += parseFloat(result.total);
        if (result.payment_status == "paid" && result.shipment_status == "delivered")
            completed++;
        if (result.payment_status == "cancelled" && result.shipment_status == "cancelled")
            cancelled++;
    });

    response.context.lifetimeSales = {
        "orders": results.length,
        "total": total,
        "completed_percentage": results.length == 0 ? 0 : Math.round(completed / results.length * 100),
        "cancelled_percentage": results.length == 0 ? 0 : Math.round(cancelled / results.length * 100)
    }
}