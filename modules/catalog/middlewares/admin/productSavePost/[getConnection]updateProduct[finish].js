var { update } = require('@nodejscart/mysql-query-builder')

module.exports = async (request, response, stack) => {
    if (!request.body.product_id)
        return;

    let connection = await stack["getConnection"];
    await update("product").given(request.body)
        .where("product_id", "=", request.body.product_id)
        .execute(connection);
    await update("product_description")
        .given(request.body).where("product_description_product_id", "=", request.body.product_id)
        .execute(connection);

    return request.body.product_id;
}