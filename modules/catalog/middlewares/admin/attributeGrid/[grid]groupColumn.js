const { select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");
const { get } = require("../../../../../lib/util/get");

module.exports = async (request, response, stack) => {
    /* Wait for attributes to be loaded */
    await stack['grid'];

    /* Loading all attribute groups */
    assign(response.context, { attributeGroups: JSON.parse(JSON.stringify(await select().from('attribute_group').execute(pool))) })
    /* Saving group API */
    assign(response.context, { saveAttributeGroupUrl: buildAdminUrl('attributeGroupSavePost') });
    let attributes = get(response.context, 'grid.attributes', []);
    for (let index = 0; index < attributes.length; index++) {
        let query = select().from('attribute_group', 'group');
        query.innerJoin('attribute_group_link', 'link')
            .on('`group`.attribute_group_id', '=', 'link.`group_id`').and('`link`.attribute_id', '=', attributes[index].attribute_id);
        attributes[index]['groups'] = JSON.parse(JSON.stringify(await query.execute(pool)));
    }
}