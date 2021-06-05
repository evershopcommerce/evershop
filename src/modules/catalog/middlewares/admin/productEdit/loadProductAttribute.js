var { select } = require('@nodejscart/mysql-query-builder')
import { pool } from '../../../../../lib/mysql/connection';
import { assign } from "../../../../../lib/util/assign";

module.exports = async (request, response) => {
    let attributes = await select()
        .from("product_attribute_value_index")
        .where("product_id", "=", request.params.id).execute(pool);

    assign(response.context, { product: { attributes: JSON.parse(JSON.stringify(attributes)) } });
}