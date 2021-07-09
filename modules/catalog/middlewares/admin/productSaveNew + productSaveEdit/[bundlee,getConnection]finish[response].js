const { commit, rollback } = require('@nodejscart/mysql-query-builder');
const { buildAdminUrl } = require('../../../../../lib/routie');

module.exports = async (request, response, stack, next) => {
    let promises = [];
    for (let id in stack) {
        // Check if middleware is async
        if (Promise.resolve(stack[id]) === stack[id])
            promises.push(stack[id]);
    }
    let connection = await stack["getConnection"];
    try {
        await Promise.all(promises);
        await commit(connection);

        // Store success message to session
        request.session.notifications = request.session.notifications || [];
        request.session.notifications.push({
            type: "success",
            message: request.params.id ? "Product was updated successfully" : "Product was created successfully"
        });
        request.session.save();
        response.json({
            data: { redirectUrl: buildAdminUrl("productGrid") },
            success: true,
            message: request.params.id ? "Product was updated successfully" : "Product was created successfully"
        })
    } catch (error) {
        console.log(error);
        await rollback(connection);
        response.json({
            success: false,
            message: error.message
        })
    }
}