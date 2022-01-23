const { update } = require('@nodejscart/mysql-query-builder')

module.exports = async (request, response, stack) => {
    if (!request.body.cms_page_id)
        return;
    let data = request.body;
    let connection = await stack["getConnection"];
    await update("cms_page").given(data)
        .where("cms_page_id", "=", data.cms_page_id)
        .execute(connection);
    await update("cms_page_description")
        .given(request.body).where("cms_page_description_cms_page_id", "=", data.cms_page_id)
        .execute(connection);

    return data.cms_page_id;
}