const { update } = require('@nodejscart/mysql-query-builder')

module.exports = async (request, response, stack) => {
    if (!request.body.category_id)
        return;

    let connection = await stack["getConnection"];
    await update("category").given(request.body)
        .where("category_id", "=", request.body.category_id)
        .execute(connection);
    await update("category_description")
        .given(request.body).where("category_description_category_id", "=", request.body.category_id)
        .execute(connection);

    return request.body.id;
}