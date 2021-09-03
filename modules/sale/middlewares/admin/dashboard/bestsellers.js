const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildAdminUrl } = require('../../../../../lib/routie');

module.exports = async function bestsellers(request, response) {
    try {
        let query = select();
        query.from("product").leftJoin("product_description").on("product.`product_id`", "=", "product_description.`product_description_product_id`");
        query.leftJoin("order_item").on("product.`product_id`", "=", "order_item.`product_id`");
        query.select("product.`product_id`", "product_id")
            .select("order_item.`product_id`")
            .select("image")
            .select("name")
            .select("price")
            .select("SUM(order_item.`qty`)", "qty")
            .select("SUM(order_item.`product_id`)", "sum")
            .where("order_item_id", "IS NOT", null);
        query.groupBy("order_item.`product_id`")
            .orderBy("qty", "DESC")
            .limit(0, 5);
        let results = await query.execute(pool);
        response.context.bestsellers = results.map(p => {
            let product = { ...p, editUrl: buildAdminUrl('productEdit', { id: p.product_id }) }
            if (p.image) {
                product.imageUrl = buildAdminUrl('adminStaticAsset', [p.image]);
            }
            return product;
        });;
    } catch (error) {
        throw new Error(error);
    }
};