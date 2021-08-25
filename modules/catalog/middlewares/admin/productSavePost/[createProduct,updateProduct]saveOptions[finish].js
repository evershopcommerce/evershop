var { insert, del, select, update } = require('@nodejscart/mysql-query-builder');

module.exports = async (request, response, stack) => {
    let promises = [stack["createProduct"], stack["updateProduct"]];
    let results = await Promise.all(promises);
    let productId;
    if (request.body.product_id) {
        productId = request.body.product_id;
    } else {
        productId = results[0]["insertId"];
    }
    let connection = await stack["getConnection"];
    if (!request.body.options) {
        // Clean all options
        await del("product_custom_option").where("product_custom_option_product_id", "=", productId).execute(connection);
        return;
    }
    // Delete all old options
    await del("product_custom_option")
        .where("product_custom_option_product_id", "=", productId)
        .and("product_custom_option_id", "NOT IN", Object.keys(request.body.options)).execute(connection);

    // Get all remaining options for comparison
    let options = await select("product_custom_option_id").from("product_custom_option").where("product_custom_option_product_id", "=", productId).execute(connection);
    for (const id in request.body.options) {
        let option;
        if (options.find(o => parseInt(o.product_custom_option_id) === parseInt(id)))
            option = await update("product_custom_option")
                .given({ ...request.body.options[id], is_required: request.body.options[id]['is_required'] || 0 })
                .where("product_custom_option_id", "=", id)
                .execute(connection);
        else
            option = await insert("product_custom_option")
                .given({ ...request.body.options[id], is_required: request.body.options[id]['is_required'] || 0 })
                .prime("product_custom_option_product_id", productId)
                .execute(connection);
        await saveOptionValues(parseInt(option.insertId || id), request.body.options[id]["values"] || [], connection);
    }
}

async function saveOptionValues(optionId, values, connection) {
    if (!values || values === 0) {
        await del("product_custom_option_value").where("option_id", "=", optionId).execute(connection);
        return;
    }

    // Delete all old option values
    await del("product_custom_option_value")
        .where("option_id", "=", optionId)
        .andWhere("product_custom_option_value_id", "NOT IN", Object.keys(values))
        .execute(connection);
    // Get all remaining option values for comparison
    let _values = await select("product_custom_option_value_id")
        .from("product_custom_option_value")
        .where("option_id", "=", optionId).execute(connection);

    for (const id in values) {
        if (_values.find(v => parseInt(v.product_custom_option_value_id) === parseInt(id)))
            await update("product_custom_option_value")
                .given(values[id])
                .where("product_custom_option_value_id", "=", id)
                .execute(connection);
        else
            await insert("product_custom_option_value")
                .given(values[id])
                .prime("option_id", optionId)
                .execute(connection);
    }
}