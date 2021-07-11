var { insert, select, update, insertOnUpdate, del } = require('@nodejscart/mysql-query-builder');
const { get } = require("../../../../../lib/util/get");

module.exports = async (request, response, stack) => {
    let promises = [stack["createProduct"], stack["updateProduct"]];
    let results = await Promise.all(promises);
    let productId;
    if (request.params.id) {
        productId = request.params.id;
    } else {
        productId = results["insertId"];
    }
    let connection = await stack["getConnection"];
    let attributes = get(request, "body.attributes", {});

    for (let code in attributes) {
        let attr = await select().from("attribute").where("attribute_code", "=", code).load(connection);
        if (!attr)
            return;

        if (attr['type'] === 'textarea' || attr['type'] === 'text') {
            let flag = await select("attribute_id")
                .from("product_attribute_value_index")
                .where("product_id", "=", productId)
                .and("attribute_id", "=", attr['attribute_id'])
                .load(connection);

            if (flag)
                await update('product_attribute_value_index')
                    .given({ "option_text": attributes[code].trim() })
                    .where("product_id", "=", productId)
                    .and("attribute_id", "=", attr['attribute_id'])
                    .execute(connection);
            else {
                await insert('product_attribute_value_index')
                    .prime("product_id", productId)
                    .prime("attribute_id", attr['attribute_id'])
                    .prime("option_text", attributes[code].trim())
                    .execute(connection);
            }
        } else if (attr['type'] === 'multiselect') {
            await Promise.all(attributes[code].map(() => (async () => {
                let option = await select().from('attribute_option').where("attribute_option_id", "=", parseInt(val)).load(connection);
                if (option === null)
                    return;
                await insertOnUpdate('product_attribute_value_index')
                    .prime("option_id", option["attribute_option_id"])
                    .prime("product_id", productId)
                    .prime("attribute_id", attr['attribute_id'])
                    .prime("option_text", option["option_text"])
                    .execute(connection);
            })()))
        } else if (attr['type'] === 'select') {
            let option = await select().from('attribute_option').where("attribute_option_id", "=", parseInt(attributes[code])).load(connection);
            if (option === false)
                continue;
            // Delete old option if any
            await del('product_attribute_value_index')
                .where('attribute_id', "=", attr['attribute_id'])
                .and('product_id', "=", productId)
                .execute(connection);
            // Insert new option
            await insertOnUpdate('product_attribute_value_index')
                .prime("option_id", option["attribute_option_id"])
                .prime("product_id", productId)
                .prime("attribute_id", attr['attribute_id'])
                .prime("option_text", option["option_text"])
                .execute(connection);
        } else {
            await insertOnUpdate('product_attribute_value_index')
                .prime("option_text", attributes[code])
                .execute(connection);
        }
    }
};
