var { select } = require('@nodejscart/mysql-query-builder')
import { pool } from '../../../../../lib/mysql/connection';

module.exports = async (request, response, stack) => {
    let query = select();
    query.from("product_custom_option").where("product_custom_option_product_id", "=", request.params.id);
    let results = await query.execute(pool);

    response.context.productOptions = await Promise.all(results.map(async (r) => {
        let valueQuery = select();
        valueQuery
            .from("product_custom_option_value")
            .where("option_id", "=", r.product_custom_option_id);
        let values = await valueQuery.execute(pool);
        return {
            ...r, option_id: r.product_custom_option_id, values: values.map(v => { return { ...v, value_id: v.product_custom_option_value_id } })
        }
    }));
}