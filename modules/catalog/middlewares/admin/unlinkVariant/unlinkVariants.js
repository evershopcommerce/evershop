const { select, update } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    let connection = await getConnection();
    let product = await select().from('product').where('product_id', '=', parseInt(`0${request.body.id}`)).load(connection);
    if (!product) {
        response.json({
            data: {},
            message: 'Requested product does not exist',
            success: false
        })
    } else {
        try {
            await update('product')
                .given({ "variant_group_id": null, "visibility": null })
                .where('product_id', '=', parseInt(`0${request.body.id}`))
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
}