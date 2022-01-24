const { del } = require('@nodejscart/mysql-query-builder')
const { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    try {
        let attributeIds = request.body.ids;
        await del('attribute')
            .where('attribute_id', 'IN', attributeIds.split(','))
            .execute(pool)
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