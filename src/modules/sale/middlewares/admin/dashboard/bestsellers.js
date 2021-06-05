const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { getComponentSource } = require('../../../../../lib/helpers');

module.exports = async function bestsellers(request, response) {
    response.addComponent("bestsellers", "left.side", getComponentSource("sale/components/admin/dashboard/bestsellers.js"), {
        "listUrl": ""
    }, 20)

    try {
        let query = select();
        query.from("product").leftJoin("product_description").on("product.`product_id`", "=", "product_description.`product_description_product_id`");
        query.leftJoin("order_item").on("product.`product_id`", "=", "order_item.`product_id`");
        query.select("product.`product_id`", "product_id")
            .select("order_item.`product_id`")
            .select("sku")
            .select("name")
            .select("price")
            .select("SUM(order_item.`qty`)", "qty")
            .select("SUM(order_item.`product_id`)", "sum")
            .where("order_item_id", "IS NOT", null);
        query.groupBy("order_item.`product_id`")
            .orderBy("qty", "DESC")
            .limit(0, 20);
        let results = await query.execute(pool);
        response.context.bestsellers = results.map(p => { return { ...p } });;
    } catch (error) {
        throw new Error(error);
    }
};