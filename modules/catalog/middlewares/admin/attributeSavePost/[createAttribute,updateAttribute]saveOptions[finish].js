const { insert, del, select, update, insertOnUpdate } = require('@nodejscart/mysql-query-builder');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack) => {
    let promises = [stack["createAttribute"], stack["updateAttribute"]];
    let results = await Promise.all(promises);
    let attributeId;
    let attributeData = request.body;
    if (request.body.attribute_id) {
        attributeId = request.body.attribute_id;
    } else {
        attributeId = results[0]["insertId"];
    }
    let connection = await stack["getConnection"];

    /* Save options */
    if (!['select', 'multiselect'].includes(get(request.body, "type"))) {
        await del('attribute_option').where('attribute_id', '=', attributeId).execute(connection);
        return;
    }
    let options = get(attributeData, "options", {});
    let ids = Object.keys(options).map(Number);
    let oldOptions = await select().from('attribute_option').where('attribute_id', '=', attributeId).execute(connection);
    for (const oldOption of oldOptions) {
        if (!ids.includes(parseInt(oldOption['attribute_option_id'])))
            await del('attribute_option')
                .where('attribute_option_id', '=', oldOption['attribute_option_id'])
                .execute(connection);
    }
    /* Adding new options */
    for (var key in options) {
        if (options.hasOwnProperty(key)) {
            /* This is an update */
            if (await select().from('attribute_option').where('attribute_option_id', '=', key).load(connection)) {
                await update('attribute_option').given({
                    ...options[key],
                    attribute_id: attributeId,
                    attribute_code: get(attributeData, "attribute_code")
                })
                    .where('attribute_option_id', '=', key)
                    .execute(connection);
            } else {
                await insert("attribute_option")
                    .given({
                        ...options[key],
                        attribute_id: attributeId,
                        attribute_code: get(attributeData, "attribute_code")
                    })
                    .execute(connection);
            }
        }
    }

    return;
}