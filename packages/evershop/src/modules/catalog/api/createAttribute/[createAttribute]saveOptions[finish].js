/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const { insert } = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const attribute = await delegate.createAttribute;
  const connection = await delegate.getConnection;
  const attributeData = request.body;
  /* Save options */
  const options = get(attributeData, 'options', []);

  // Ignore updating options if it is not present in the data
  if (options.length === 0) {
    return;
  }

  /* Adding new options */
  for (const option of options) {
    await insert('attribute_option')
      .given({
        option_text: option.option_text,
        attribute_id: attribute.insertId,
        attribute_code: get(attributeData, 'attribute_code')
      })
      .execute(connection);
  }
};
