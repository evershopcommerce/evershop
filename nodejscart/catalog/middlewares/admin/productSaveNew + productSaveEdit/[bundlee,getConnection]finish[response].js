const { commit, rollback } = require('../../../../../lib/mysql/connection');
const { buildAdminUrl } = require('../../../../../lib/routie');

module.exports = async (request, response, stack, next) => {
    let promises = [];
    for (let id in stack) {
        // Check if middleware is async
        if (Promise.resolve(stack[id]) === stack[id])
            promises.push(stack[id]);
    }
    try {
        await Promise.all(promises);
        let connection = await stack["getConnection"];
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
        let connection = await stack["getConnection"];
        await rollback(connection);
        response.json({
            success: false,
            message: error.message
        })
    }
}