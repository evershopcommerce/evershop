var { select } = require('@nodejscart/mysql-query-builder')
var { pool } = require('../../../../../lib/mysql/connection');
const { getComponentSource } = require('../../../../../lib/helpers');


module.exports = async (request, response) => {

    response.addComponent(
        "bestcustomers",
        "right.side",
        getComponentSource("sale/components/admin/dashboard/bestcustomers.js"),
        {
            "listUrl": ""
        },
        20
    );

    let query = select();
    query.from("customer").innerJoin("`order`").on("customer.`customer_id`", "=", "`order`.`customer_id`");
    query.select("customer.`customer_id`", "customer_id")
        .select("customer.`full_name`", "full_name")
        .select("COUNT(`order`.`order_id`)", "orders")
        .select("SUM(`order`.`grand_total`)", "total")
    query.groupBy("customer.`customer_id`")
        .orderBy("orders", "DESC")
        .limit(0, 20);
    let results = await query.execute(pool);

    response.context.bestCustomers = results.map(c => { return { ...c } });
}