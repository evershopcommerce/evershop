/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const {
  insertOnUpdate
} = require('@evershop/mysql-query-builder');
const { get } = require('../../../../lib/util/get');

module.exports = async (request, response, delegate) => {
  const attribute = await delegate.createAttribute;
  let attributeId = attribute.insertId;
  const attributeData = request.body;

  const connection = await delegate.getConnection;
  if (attributeData.groups === undefined) {
    return; // Ignore updating groups if it is not present in the data
  }
  const groups = get(attributeData, 'groups', []);

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index];
    await insertOnUpdate('attribute_group_link')
      .given({ attribute_id: attributeId, group_id: group })
      .execute(connection);
  }
};
