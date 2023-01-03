/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const {
  del, select, insertOnUpdate
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../lib/util/get');

module.exports = async (request, response, delegate) => {
  const attribute = await delegate.updateAttribute;
  const attributeId = attribute['attribute_id'];
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
  currentGroups.forEach(g => {
    if (!groups.find((group) => parseInt(group) === parseInt(g.group_id))) {
      shouldDelete.push(g.group_id)
    }
  });

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    await insertOnUpdate('attribute_group_link')
      .given({ attribute_id: attributeId, group_id: group })
      .execute(connection);
  }

  await del('attribute_group_link')
    .where('group_id', 'IN', shouldDelete)
    .execute(connection);
};
