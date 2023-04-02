/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const {
  del,
  select,
  insertOnUpdate
} = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const attribute = await delegate.updateAttribute;
  const attributeId = attribute.attribute_id;
  const attributeData = request.body;

  const connection = await delegate.getConnection;
  if (attributeData.groups === undefined) {
    return; // Ignore updating groups if it is not present in the data
  }
  const groups = get(attributeData, 'groups', []);

  // Get the current groups
  const currentGroups = await select()
    .from('attribute_group_link')
    .where('attribute_id', '=', attributeId)
    .execute(connection);

  const shouldDelete = [];
  currentGroups.forEach((g) => {
    if (
      !groups.find((group) => parseInt(group, 10) === parseInt(g.group_id, 10))
    ) {
      shouldDelete.push(g.group_id);
    }
  });

  for (let index = 0; index < groups.length; index += 1) {
    const group = await select()
      .from('attribute_group')
      .where('attribute_group_id', '=', groups[index])
      .load(connection, false);
    if (group) {
      await insertOnUpdate('attribute_group_link', ['attribute_id', 'group_id'])
        .given({ attribute_id: attributeId, group_id: groups[index] })
        .execute(connection);
    }
  }

  await del('attribute_group_link')
    .where('group_id', 'IN', shouldDelete)
    .and('attribute_id', '=', attributeId)
    .execute(connection);
};
