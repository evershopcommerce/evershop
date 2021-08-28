const { insert } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response, stack) => {
    if (request.body.attribute_id)
        return;
    let connection = await stack["getConnection"];
    let result = await insert("attribute").given(request.body).execute(connection);

    return result;
}