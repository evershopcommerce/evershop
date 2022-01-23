const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack, next) => {
    try {
        let sortBy = ["price", "name"].includes(request.query.sortBy) ? request.query.sortBy : undefined;
        let sortOrder = ["asc", "desc"].includes(request.query.sortOrder) ? request.query.sortOrder : "asc";

        let query = await stack["productsQueryInit"];

        if (sortBy === "price") {
            query.orderBy("product.`price`", sortOrder);
        } else if (sortBy === "name") {
            query.orderBy("product_description.`name`", sortOrder);
        } else {
            query.orderBy("product.`product_id`", sortOrder);
        }

        assign(response.context, {
            sortBy, sortOrder
        }
        )
        next();
    } catch (e) {
        next(e);
    }
};