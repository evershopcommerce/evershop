const { insert } = require('@nodejscart/mysql-query-builder');
const { merge } = require('../../../../../lib/util/merge');

module.exports = async (request, response, stack) => {
    if (request.body.category_id)
        return;
    let data = merge(request.body, { include_in_nav: 0 })
    let connection = await stack["getConnection"];
    let result = await insert("category").given(data).execute(connection);
    await insert("category_description")
        .given(data)
        .prime("category_description_category_id", result.insertId).execute(connection);

    return result;
}