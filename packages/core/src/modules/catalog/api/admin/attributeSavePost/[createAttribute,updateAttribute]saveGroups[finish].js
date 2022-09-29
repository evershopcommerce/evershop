/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const {
  del, select, insertOnUpdate
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack) => {
  const promises = [stack.createAttribute, stack.updateAttribute];
  const results = await Promise.all(promises);
  let attributeId;
  const attributeData = request.body;
  if (request.body.attribute_id) {
    attributeId = request.body.attribute_id;
  } else {
    attributeId = results[0].insertId;
  }
  const connection = await stack.getConnection;
  if (attributeData.groups === undefined) {
    return; // Ignore updating groups if it is not present in the data
  }
  const groups = get(attributeData, 'groups', []);

  // Get the current groups
  const currentGroups = await select().from('attribute_group_link').where('attribute_id', '=', attributeId).execute(connection);
  const shouldDelete = [];
  currentGroups.forEach(g => {
    if (!groups.find((group) => parseInt(group) === parseInt(g.group_id))) {
      shouldDelete.push(g.group_id)
    }
  });

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    await insertOnUpdate('attribute_group_link').given({ attribute_id: attributeId, group_id: group }).execute(connection);
  }

  await del('attribute_group_link').where('group_id', 'IN', shouldDelete).execute(connection);
};
