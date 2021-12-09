const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildAdminUrl } = require('../../../../../lib/routie');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response) => {
    let keyword = request.query['keyword'];

    // Search products
    let query = select('product_id', 'sku')
        .select('d.`name`', 'name')
        .from('product', 'p');
    query.leftJoin('product_description', 'd')
        .on('p.`product_id`', '=', 'd.`product_description_product_id`');
    query.where('p.sku', 'LIKE', `%${keyword}%`)
        .or('d.name', 'LIKE', `%${keyword}%`)
        .or('d.description', 'LIKE', `%${keyword}%`);
    query.limit(0, 20);
    let products = (await query.execute(pool)).map(p => {
        return {
            name: p.name,
            url: buildAdminUrl('productEdit', { id: p.product_id }),
            description: `Sku ${p.sku}`
        }
    });
    if (products.length > 0) {
        response.payload = response.payload || [];
        assign(response.payload, [{ name: 'Products', items: products }]);
    }
}