const { commit, rollback } = require('@evershop/mysql-query-builder');
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
    response.json({
      data: { redirectUrl: buildUrl('cmsPageGrid') },
      success: true,
      message: request.params.id ? 'Page was updated successfully' : 'Page was created successfully'
    });
  } catch (error) {
    await rollback(connection);
    response.json({
      success: false,
      message: error.message
    });
  }
};
