const { commit, rollback } = require('@evershop/mysql-query-builder');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  try {
    const promises = [];
    Object.keys(stack).forEach((id) => {
      // Check if middleware is async
      if (stack[id] instanceof Promise) {
        promises.push(stack[id]);
      }
    });
    const connection = await stack.getConnection;
    await Promise.all(promises);
    await commit(connection);
    response.json({
      data: {},
      success: true,
      message: 'Coupon(s) was created successfully'
    });
  } catch (e) {
    await rollback(connection);
    response.json({
      data: {},
      success: false,
      message: 'Somthing wrong. Please try again'
    });
  }
};
