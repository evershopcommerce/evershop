const { select } = require('@nodejscart/mysql-query-builder')
const { pool } = require("../../../../../lib/mysql/connection");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack, next) => {
    try {
        let query = select();
        query.from("cms_page")
            .leftJoin("cms_page_description")
            .on("cms_page.`cms_page_id`", "=", "cms_page_description.`cms_page_description_cms_page_id`");
        query.where("status", "=", 1);
        query.where("cms_page_description.`url_key`", "=", request.params.url_key);
        let cmsPage = await query.load(pool);
        if (cmsPage === null) {
            response.status(404);
            next();
        } else {
            assign(response.context, { cmsPage: JSON.parse(JSON.stringify(cmsPage)), metaTitle: cmsPage.meta_title || cmsPage.name, metaDescription: cmsPage.meta_description || cmsPage.short_description });
            next();
        }
    } catch (e) {
        next(e);
    }
}