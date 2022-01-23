const { update } = require('@nodejscart/mysql-query-builder')

module.exports = async (request, response, stack) => {
    if (!request.body.attribute_id)
        return;

    let connection = await stack["getConnection"];
    await update("attribute").given(request.body)
        .where("attribute_id", "=", request.body.attribute_id)
        .execute(connection);

    return request.body.id;
}