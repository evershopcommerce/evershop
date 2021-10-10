const { del, update } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    let connection = await getConnection();
    try {
        let productIds = request.body.ids;
        await update('product')
            .given({ status: 1 })
            .where('product_id', 'IN', productIds.split(','))
            .execute(connection)
        response.json({
            data: {},
            success: true
        })
    } catch (e) {
        response.json({
            data: {},
            message: e.message,
            success: false
        })
    }
}