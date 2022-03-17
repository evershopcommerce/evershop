const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response) => {
  const query = select();
  query.from('attribute_group');
  const results = await query.execute(pool);

  const groups = await Promise.all(results.map(async (group) => {
    const attributeQuery = select();
    attributeQuery
      .select('attribute.*')
      .from('attribute')
      .leftJoin('attribute_group_link')
      .on('attribute_group_link.`attribute_id`', '=', 'attribute.`attribute_id`');
    attributeQuery.where('attribute_group_link.`group_id`', '=', group.attribute_group_id);
    const attributes = await attributeQuery.execute(pool);
    return {
      ...group,
      attributes: await Promise.all(attributes.map(async (a) => {
        const option = select();
        option
          .from('attribute_option')
          .where('`attribute_id`', '=', a.attribute_id);
        const options = await option.execute(pool);
        return { ...a, options: options.map((o) => ({ ...o })) };
      }))
    };
  }));

  // Get "select" attributes for variant setup
  const selectAttributes = await select().from('attribute').where('type', '=', 'select').execute(pool);
  response.context.variantableAttributes = await Promise.all(selectAttributes.map(async (a) => {
    const options = await select()
      .from('attribute_option')
      .where('`attribute_id`', '=', a.attribute_id).execute(pool);
    return { ...a, options: options.map((o) => ({ ...o })) };
  }));

  response.context.attributeData = groups;
};
