const { select } = require('@nodejscart/mysql-query-builder')
const { pool } = require('../../../../../lib/mysql/connection');
const { buildAdminUrl } = require('../../../../../lib/routie');
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack, next) => {
    let query = select();
    let attributeId = request.params.id;
    query.from("attribute").where("attribute_id", "=", attributeId);
    let attribute = await query.load(pool);
    if (attribute === null) {
        request.session.notifications = request.session.notifications || [];
        request.session.notifications.push({
            type: "error",
            message: "Requested attribute does not exist"
        });
        request.session.save();
        response.redirect(302, buildAdminUrl("attributeGrid"));
    } else {
        /* Load attribute options */
        attribute.options = await select().from('attribute_option').where('attribute_id', '=', attributeId).execute(pool);
        assign(response.context, { attribute: JSON.parse(JSON.stringify(attribute)) });
        assign(response.context, { page: { heading: attribute.attribute_name } });
        next();
    }
}