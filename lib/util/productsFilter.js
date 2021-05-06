const { pool } = require("../mysql/connection");
const { select } = require("../mysql/query");

/**
 *  This function takes a list of product ID
 * and get all attribute, category and price can be used in filter table
 * @param {Array[Number]} productIds
 */
export async function productsFilters(productIds = []) {
    let priceRange = await select()
        .select("MIN(price)", "min")
        .select("MAX(price)", "max")
        .from("product")
        .where("product_id", "IN", productIds)
        .execute(pool);

    // Filterable attributes
    let query = select("attribute.`attribute_name`", "attribute_name")
        .select("attribute.`type`", "type")
        .select("attribute.`is_filterable`", "is_filterable")
        .select("product_attribute_value_index.`attribute_id`", "attribute_id")
        .select("attribute.`attribute_code`", "attribute_code")
        .select("product_attribute_value_index.`option_id`", "option_id")
        .select("product_attribute_value_index.`option_text`", "option_text")
        .from("attribute");
    query.innerJoin("product_attribute_value_index")
        .on("attribute.`attribute_id`", "=", "product_attribute_value_index.`attribute_id`");

    query.where("product_attribute_value_index.`product_id`", "IN", productIds)
        .and("type", "IN", ["select", "multiselect"])
        .and("is_filterable", "=", 1);

    let attributeData = await query.execute(pool);

    let attributes = [];
    for (let i = 0; i < attributeData.length; i++) {
        let index = attributes.findIndex(a => a.attribute_code === attributeData[i]["attribute_code"]);
        if (index === -1) {
            attributes.push({
                "attribute_name": attributeData[i]["attribute_name"],
                "attribute_id": attributeData[i]["attribute_id"],
                "attribute_code": attributeData[i]["attribute_code"],
                "options": [
                    {
                        "option_id": attributeData[i]['option_id'],
                        "option_text": attributeData[i]['option_text'],
                        "productCount": 1
                    }
                ]
            });
        } else {
            let idx = attributes[index]["options"].findIndex(o => parseInt(o.option_id) === parseInt(attributeData[i]['option_id']));
            if (idx === -1) {
                attributes[index]["options"] = attributes[index]["options"].concat({
                    "option_id": attributeData[i]['option_id'],
                    "option_text": attributeData[i]['option_text'],
                    "productCount": 1
                });
            } else {
                attributes[index]["options"][idx]["productCount"]++;
            }
        }
    }

    return {
        "price": priceRange[0],
        "attributes": attributes
    }
}