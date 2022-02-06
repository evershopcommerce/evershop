/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const {
  insert, del, select, update
} = require('@nodejscart/mysql-query-builder');
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

  /* Save options */
  if (!['select', 'multiselect'].includes(get(request.body, 'type'))) {
    await del('attribute_option').where('attribute_id', '=', attributeId).execute(connection);
    return;
  }
  const options = get(attributeData, 'options', {});
  const ids = Object.keys(options).map(Number);
  const oldOptions = await select().from('attribute_option').where('attribute_id', '=', attributeId).execute(connection);
  for (const oldOption of oldOptions) {
    if (!ids.includes(parseInt(oldOption.attribute_option_id, 10))) {
      await del('attribute_option')
        .where('attribute_option_id', '=', oldOption.attribute_option_id)
        .execute(connection);
    }
  }
  /* Adding new options */
  for (const key in options) {
    if (options.hasOwnProperty(key)) {
      /* This is an update */
      if (await select().from('attribute_option').where('attribute_option_id', '=', key).load(connection)) {
        await update('attribute_option').given({
          ...options[key],
          attribute_id: attributeId,
          attribute_code: get(attributeData, 'attribute_code')
        })
          .where('attribute_option_id', '=', key)
          .execute(connection);
      } else {
        await insert('attribute_option')
          .given({
            ...options[key],
            attribute_id: attributeId,
            attribute_code: get(attributeData, 'attribute_code')
          })
          .execute(connection);
      }
    }
  }
};
