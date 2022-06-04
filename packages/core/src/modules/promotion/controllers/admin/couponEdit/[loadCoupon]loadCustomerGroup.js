const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response) => {
  const groups = await select()
    .from('customer_group')
    .execute(pool);

  assign(response.context, { customerGroups: groups.map(group => { return { value: group.customer_group_id, text: group.group_name } }) });
};
