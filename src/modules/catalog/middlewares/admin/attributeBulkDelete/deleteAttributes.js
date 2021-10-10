const { del } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    let connection = await getConnection();
    try {
        let attributeIds = request.body.ids;
        await del('attribute')
            .where('attribute_id', 'IN', attributeIds.split(','))
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