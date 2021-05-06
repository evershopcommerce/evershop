const { select } = require('../../../../../lib/mysql/query')
import { pool } from '../../../../../lib/mysql/connection';
const { buildAdminUrl } = require('../../../../../lib/routie');
import { assign } from "../../../../../lib/util/assign";

module.exports = async (request, response, stack, next) => {
    let query = select();
    query.from("cms_page").leftJoin("cms_page_description").on("cms_page.`cms_page_id`", "=", "cms_page_description.`cms_page_description_cms_page_id`");
    query.where("cms_page_id", "=", request.params.id);
    let page = await query.load(pool);
    if (page === null) {
        request.session.notifications = request.session.notifications || [];
        request.session.notifications.push({
            type: "error",
            message: "Requested page does not exist"
        });
        request.session.save();
        response.redirect(302, buildAdminUrl("pageGrid"));
    } else {
        assign(response.context, { page: JSON.parse(JSON.stringify(page)) });
        next();
    }
}