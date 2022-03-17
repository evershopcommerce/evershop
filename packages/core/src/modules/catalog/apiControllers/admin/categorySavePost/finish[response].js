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
  const results = await Promise.allSettled(promises);
  if (results.findIndex((r) => r.status === 'rejected') === -1) {
    await commit(connection);
    // Store success message to session
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'success',
      message: request.body.category_id ? 'Category was updated successfully' : 'Category was created successfully'
    });
    request.session.save();
    response.json({
      data: { redirectUrl: buildUrl('categoryGrid') },
      success: true,
      message: request.body.category_id ? 'Category was updated successfully' : 'Category was created successfully'
    });
  } else {
    await rollback(connection);
  }
};
