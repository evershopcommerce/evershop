const { commit, rollback } = require('@nodejscart/mysql-query-builder');
const { buildAdminUrl } = require('../../../../../lib/routie');

module.exports = async (request, response, stack, next) => {
    let promises = [];
    for (let id in stack) {
        // Check if middleware is async
        if (stack[id] instanceof Promise) {
            promises.push(stack[id]);
        }
    }
    let connection = await stack["getConnection"];
    try {
        await Promise.all(promises);
        await commit(connection);

        // Store success message to session
        request.session.notifications = request.session.notifications || [];
        request.session.notifications.push({
            type: "success",
            message: request.params.id ? "Page was updated successfully" : "Page was created successfully"
        });
        request.session.save();
        response.json({
            data: { redirectUrl: buildAdminUrl("cmsPageGrid") },
            success: true,
            message: request.params.id ? "Page was updated successfully" : "Page was created successfully"
        })
    } catch (error) {
        await rollback(connection);
        response.json({
            success: false,
            message: error.message
        })
    }
}