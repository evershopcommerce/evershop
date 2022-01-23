const { del } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    let connection = await getConnection();
    try {
        let pageIds = request.body.ids;
        await del('cms_page')
            .where('cms_page_id', 'IN', pageIds.split(','))
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