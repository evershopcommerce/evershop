const { update } = require('../../../../../lib/mysql/query')

module.exports = async (request, response, stack) => {
    if (!request.params.id)
        return;

    let connection = await stack["getConnection"];
    await update("cms_page").given(request.body)
        .where("cms_page_id", "=", request.params.id)
        .execute(connection);
    await update("cms_page_description")
        .given(request.body).where("cms_page_description_cms_page_id", "=", request.params.id)
        .execute(connection);

    return request.params.id;
}