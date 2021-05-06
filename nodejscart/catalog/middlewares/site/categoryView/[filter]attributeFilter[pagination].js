const { pool } = require('../../../../../lib/mysql/connection');
const { get } = require("../../../../../lib/util/get");
const { select } = require('../../../../../lib/mysql/query');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
    try {
        // If there is no filter, do nothing
        if (!request.query || request.query.length === 0) {
            return next();
        }

        // Wait for filterable attributes to be collected
        await stack["filter"];

        // Get the product query instance
        let query = await stack["productsQueryInit"];

        let attributeIndexQuery = select();
        attributeIndexQuery.select("product_id").from("product_attribute_value_index");

        // Get the list of filterable attributes
        let filterableAttributes = get(response.context, "productsFilter.attributes", []);
        let activeAttributes = [];
        let count = 0;
        for (let i = 0; i < filterableAttributes.length; i++) {
            let attribute = filterableAttributes[i];
            let q = request.query[attribute["attribute_code"]];
            if (Array.isArray(q)) {
                let fq = q.filter(i => parseInt(i) !== NaN);
                if (fq) {
                    count++;
                    attributeIndexQuery.orWhere("attribute_id", "=", attribute["attribute_id"]).and("option_id", "IN", fq);
                    for (let k = 0; k < fq.length; k++)
                        activeAttributes.push({ key: attribute["attribute_code"], value: fq[k] })
                }
            } else if (isNaN(parseInt(q)) === false) {
                count++;
                attributeIndexQuery.orWhere("attribute_id", "=", attribute["attribute_id"]).and("option_id", "=", parseInt(q));
                activeAttributes.push({ key: attribute["attribute_code"], value: q })
            } else {
                continue;
            }
        }

        // If there is no attribute filter, do nothing
        if (attributeIndexQuery.getWhere().isEmpty()) {
            return next();
        }

        attributeIndexQuery
            .select("COUNT(`product_id`)", "count")
            .groupBy("product_id")
            .having("count", ">=", count);
        let productIds = (await attributeIndexQuery.execute(pool)).map(p => p.product_id);
        if (productIds.length > 0)
            query.andWhere("product_id", "IN", productIds);
        else
            query.andWhere("product_id", "=", 0); // Just a dirty code for no product found

        assign(response.context, { activeProductsFilters: activeAttributes })
        next();
    } catch (e) {
        next(e);
    }
};