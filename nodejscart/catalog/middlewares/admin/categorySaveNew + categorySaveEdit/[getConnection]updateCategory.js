const { update } = require('../../../../../lib/mysql/query')

module.exports = async (request, response, stack) => {
    if (!request.params.id)
        return;

    let connection = await stack["getConnection"];
    await update("category").given(request.body)
        .where("category_id", "=", request.params.id)
        .execute(connection);
    await update("category_description")
        .given(request.body).where("category_description_category_id", "=", request.params.id)
        .execute(connection);

    return request.params.id;
}