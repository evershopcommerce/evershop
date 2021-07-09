var { select } = require('@nodejscart/mysql-query-builder')
const { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response) => {
  let query = select();
  query.from("attribute_group");
  let results = await query.execute(pool);

  let groups = await Promise.all(results.map(async (group) => {
    let attributeQuery = select();
    attributeQuery
      .select("attribute.*")
      .from("attribute")
      .leftJoin("attribute_group_link")
      .on("attribute_group_link.`attribute_id`", "=", "attribute.`attribute_id`");
    attributeQuery.where("attribute_group_link.`group_id`", "=", group.attribute_group_id);
    let attributes = await attributeQuery.execute(pool);
    return {
      ...group, attributes: await Promise.all(attributes.map(async a => {
        let option = select();
        option
          .from("attribute_option")
          .where("`attribute_id`", "=", a.attribute_id);
        let options = await option.execute(pool);
        return { ...a, options: options.map(o => { return { ...o } }) }
      }))
    }
  }));

  // Get "select" attributes for variant setup
  let selectAttributes = await select().from("attribute").where("type", "=", "select").execute(pool);
  response.context.variantableAttributes = await Promise.all(selectAttributes.map(async a => {
    let options = await select()
      .from("attribute_option")
      .where("`attribute_id`", "=", a.attribute_id).execute(pool);
    return { ...a, options: options.map(o => { return { ...o } }) }
  }));

  response.context.attributeData = groups;
}