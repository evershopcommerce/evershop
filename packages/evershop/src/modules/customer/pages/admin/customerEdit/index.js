const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('customer')
    query.andWhere('customer.`customer_id`', '=', request.params.id);
    const customer = await query.load(pool);

    if (customer === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'customerId', customer.uuid);
      setContextValue(request, 'pageInfo', {
        title: customer.full_name,
        description: customer.full_name
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};
