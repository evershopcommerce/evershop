const { pool } = require("../../../../../lib/mysql/connection");
const { select } = require('@nodejscart/mysql-query-builder');
const { buildSiteUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");
const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = async function (request, response) {
    response.addComponent("menu", 'header', getComponentSource("cms/components/site/menu.js", true), {}, 10);

    let query = select("name")
        .select("url_key")
        .from("category", "cat");
    query.leftJoin("category_description", "des")
        .on("cat.`category_id`", "=", "des.`category_description_category_id`");
    query.where("cat.`status`", "=", 1).and("cat.`include_in_nav`", "=", 1);

    let items = (await query.execute(pool)).map(i => {
        return {
            name: i.name,
            url: buildSiteUrl("categoryView", { url_key: i.url_key })
        }
    });

    assign(response.context, { menuItems: items });
}