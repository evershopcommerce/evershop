const { select } = require('../../../../../lib/mysql/query');

module.exports = function (request, response) {
    let query = select("*").from("cms_page");
    query.leftJoin("cms_page_description").on("cms_page.`cms_page_id`", "=", "cms_page_description.`cms_page_description_cms_page_id`");

    return query;
}