var { select } = require('@nodejscart/mysql-query-builder');
const { getConnection } = require('../../../../../lib/mysql/connection');
const { buildAdminUrl } = require('../../../../../lib/routie');
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack, next) => {
    let query = select();
    query.from("product").leftJoin("product_description").on("product.`product_id`", "=", "product_description.`product_description_product_id`");
    query.where("product_id", "=", request.params.id);
    console.log('before-------')
    let product = await query.load(await getConnection());
    console.log('after load mysql-------')
    if (product === null) {
        request.session.notifications = request.session.notifications || [];
        request.session.notifications.push({
            type: "error",
            message: "Requested product does not exist"
        });
        request.session.save();
        response.redirect(302, buildAdminUrl("productGrid"));
    } else {
        assign(response.context, { product: JSON.parse(JSON.stringify(product)) });
        assign(response.context, { page: { heading: product.name } });
        console.log('after-------')
        next();
    }
}