const { insert } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response, stack) => {
    if (request.body.category_id)
        return;
    let connection = await stack["getConnection"];
    let result = await insert("category").given(request.body).execute(connection);
    await insert("category_description")
        .given(request.body)
        .prime("category_description_category_id", result.insertId).execute(connection);

    return result;
}