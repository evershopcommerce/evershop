const { insert } = require('../../../../../lib/mysql/query');

module.exports = async (request, response, stack) => {
    if (request.params.id)
        return;

    let connection = await stack["getConnection"];
    let result = await insert("cms_page").given(request.body).execute(connection);
    await insert("cms_page_description")
        .given(request.body)
        .prime("cms_page_description_cms_page_id", result.insertId).execute(connection);

    return result;
}