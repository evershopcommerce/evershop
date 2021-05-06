const { getComponentSource } = require("../../../../../lib/util");
import { pool } from '../../../../../lib/mysql/connection';
import { assign } from "../../../../../lib/util/assign";

module.exports = async (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("categoryGrid", "content", getComponentSource("catalog/components/admin/category/grid/grid.js"), { "limit": 20 }, 1);

    // execute query
    let query = stack["queryInit"];

    let limit = 20;// Default limit
    // Limit
    if (/^[0-9]+$/.test(request.query["limit"]))
        limit = parseInt(request.query["limit"]);

    let page = 1;
    // pagination
    if (/^[0-9]+$/.test(request.query["page"]))
        page = parseInt(request.query["page"]);
    assign(response.context, { grid: { page, limit } });
    query.limit((page - 1) * limit, limit);

    // Order by
    let orderBy = "category.`category_id`";
    if (request.query["sort_by"])
        orderBy = request.query["sort_by"];

    let direction = "DESC";
    if (request.query["sort_order"] === "ASC")
        direction = "DESC";

    query.orderBy(orderBy, direction);
    let categories = await query.execute(pool);
    assign(response.context, { grid: { categories: JSON.parse(JSON.stringify(categories)) } });

    query.select("COUNT(`category_id`)", "total");
    query.limit(0, 1);
    let ps = await query.execute(pool);
    assign(response.context, { grid: { total: ps[0]["total"] } });

    return categories;
}