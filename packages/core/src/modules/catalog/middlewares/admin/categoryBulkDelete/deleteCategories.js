const { del } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    let connection = await getConnection();
    try {
        let productIds = request.body.ids;
        await del('category')
            .where('category_id', 'IN', productIds.split(','))
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