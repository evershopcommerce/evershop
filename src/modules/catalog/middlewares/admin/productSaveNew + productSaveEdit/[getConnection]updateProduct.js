var { update } = require('@nodejscart/mysql-query-builder')
var { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack) => {
    if (!request.params.id)
        return;

    let connection = await stack["getConnection"];
    await update("product").given(request.body)
        .where("product_id", "=", request.params.id)
        .execute(connection);
    await update("product_description")
        .given(request.body).where("product_description_product_id", "=", request.params.id)
        .execute(connection);

    return request.params.id;
}