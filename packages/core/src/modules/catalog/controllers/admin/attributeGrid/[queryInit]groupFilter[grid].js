const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  // Handle filter
  if (request.query.group) {
    const links = await select()
      .from('attribute_group_link')
      .where('group_id', '=', request.query.group)
      .execute(pool);
    const query = stack.queryInit;
    query.andWhere('attribute.`attribute_id`', 'IN', links.map((l) => l.attribute_id));
    assign(
      response.context,
      {
        grid: {
          currentFilter: {
            group: parseInt(request.query.group, 10)
          }
        }
      }
    );
  }
  next();
};
