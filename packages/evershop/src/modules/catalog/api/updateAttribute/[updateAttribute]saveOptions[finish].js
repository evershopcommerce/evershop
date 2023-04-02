/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const {
  insert,
  del,
  select,
  update
} = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const attribute = await delegate.updateAttribute;
  const attributeId = attribute.attribute_id;
  const connection = await delegate.getConnection;
  const attributeData = request.body;
  /* Save options */
  if (!['select', 'multiselect'].includes(attribute.type)) {
    await del('attribute_option')
      .where('attribute_id', '=', attributeId)
      .execute(connection, false);
    return;
  }
  const options = get(attributeData, 'options', []);

  // Ignore updating options if it is not present in the data
  if (options.length === 0) {
    return;
  }

  const ids = options
    .filter((o) => o !== undefined)
    .map((o) => parseInt(o.option_id, 10));
  const oldOptions = await select()
    .from('attribute_option')
    .where('attribute_id', '=', attributeId)
    .execute(connection, false);

  for (const oldOption of oldOptions) {
    if (!ids.includes(parseInt(oldOption.attribute_option_id, 10))) {
      await del('attribute_option')
        .where('attribute_option_id', '=', oldOption.attribute_option_id)
        .execute(connection, false);
    }
  }
  /* Adding new options */
  for (const option of options) {
    const exists = await select()
      .from('attribute_option')
      .where('attribute_option_id', '=', option.option_id)
      .load(connection, false);

    if (exists) {
      await update('attribute_option')
        .given({
          option_text: option.option_text,
          attribute_id: attributeId,
          attribute_code: get(attribute, 'attribute_code')
        })
        .where('attribute_option_id', '=', option.option_id)
        .execute(connection, false);
    } else {
      await insert('attribute_option')
        .given({
          option_text: option.option_text,
          attribute_id: attributeId,
          attribute_code: get(attribute, 'attribute_code')
        })
        .execute(connection, false);
    }
  }
};
