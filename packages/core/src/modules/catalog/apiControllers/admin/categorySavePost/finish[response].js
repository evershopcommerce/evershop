const { commit, rollback } = require('@nodejscart/mysql-query-builder');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const promises = [];
  Object.keys(stack).forEach((id) => {
    // Check if middleware is async
    if (stack[id] instanceof Promise) {
      promises.push(stack[id]);
    }
  });

  const connection = await stack.getConnection;
  try {
    await Promise.all(promises);
    await commit(connection);

    // Store success message to session
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'success',
      message: request.params.id ? 'Category was updated successfully' : 'Category was created successfully'
    });
    response.json({
      data: { redirectUrl: buildUrl('categoryGrid') },
      success: true,
      message: request.params.id ? 'Category was updated successfully' : 'Category was created successfully'
    });
  } catch (error) {
    await rollback(connection);
    response.json({
      success: false,
      message: error.message
    });
  }
};
