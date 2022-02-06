const { commit, rollback } = require("@nodejscart/mysql-query-builder");
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async (request, response, stack, next) => {
  let promises = [];
  for (let id in stack) {
    // Check if middleware is async
    if (stack[id] instanceof Promise) {
      promises.push(stack[id]);
    }
  }
  try {
    await Promise.all(promises);
    let connection = await stack["getConnection"];
    await commit(connection);

    // Store success message to session
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: "success",
      message: request.params.id ? "Attribute was updated successfully" : "Attribute was created successfully"
    });
    response.json({
      data: { redirectUrl: buildUrl("attributeGrid") },
      success: true,
      message: request.params.id ? "Attribute was updated successfully" : "Attribute was created successfully"
    })
  } catch (error) {
    let connection = await stack["getConnection"];
    await rollback(connection);
    response.json({
      success: false,
      message: error.message
    })
  }
}