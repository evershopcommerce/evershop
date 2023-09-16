/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const {
  insert,
  select,
  update,
  insertOnUpdate,
  del
} = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  const attributes = get(request, 'body.attributes', []);

  // Get the variant if any
  const product = await select()
    .from('product')
    .where('uuid', '=', request.params.id)
    .load(connection);
  if (!product.variant_group_id) {
    await saveProductAttributes(productId, attributes, connection);
  } else {
    const promises = [saveProductAttributes(productId, attributes, connection)];

    const variantGroup = await select(
      'attribute_one',
      'attribute_two',
      'attribute_three',
      'attribute_four',
      'attribute_five'
    )
      .from('variant_group')
      .where('variant_group_id', '=', product.variant_group_id)
      .load(connection);

    // Get all the variant attributes
    const variantAttributes = await select()
      .from('attribute')
      .where(
        'attribute_id',
        'IN',
        Object.values(variantGroup).filter((v) => v !== null)
      )
      .execute(connection);

    // Remove the attributes that are variant attributes
    const filteredAttributes = attributes.filter((attr) =>
      variantAttributes.every((v) => v.attribute_code !== attr.attribute_code)
    );

    const variants = await select()
      .from('product')
      .where('variant_group_id', '=', product.variant_group_id)
      .and('product_id', '!=', productId)
      .execute(connection);

    for (let i = 0; i < variants.length; i += 1) {
      promises.push(
        saveProductAttributes(
          variants[i].product_id,
          filteredAttributes,
          connection
        )
      );
    }
    await Promise.all(promises);
  }
};

async function saveProductAttributes(productId, attributes, connection) {
  for (let i = 0; i < attributes.length; i += 1) {
    const attribute = attributes[i];
    if (attribute.value) {
      const attr = await select()
        .from('attribute')
        .where('attribute_code', '=', attribute.attribute_code)
        .load(connection);

      if (!attr) {
        return;
      }

      if (attr.type === 'textarea' || attr.type === 'text') {
        const flag = await select('attribute_id')
          .from('product_attribute_value_index')
          .where('product_id', '=', productId)
          .and('attribute_id', '=', attr.attribute_id)
          .load(connection);

        if (flag) {
          await update('product_attribute_value_index')
            .given({ option_text: attribute.value.trim() })
            .where('product_id', '=', productId)
            .and('attribute_id', '=', attr.attribute_id)
            .execute(connection);
        } else {
          await insert('product_attribute_value_index')
            .prime('product_id', productId)
            .prime('attribute_id', attr.attribute_id)
            .prime('option_text', attribute.value.trim())
            .execute(connection);
        }
      } else if (attr.type === 'multiselect') {
        await Promise.all(
          attribute.value.map(() =>
            (async () => {
              const option = await select()
                .from('attribute_option')
                .where(
                  'attribute_option_id',
                  '=',
                  parseInt(attribute.value, 10)
                )
                .load(connection);
              if (option === null) {
                return;
              }
              await insertOnUpdate('product_attribute_value_index', [
                'product_id',
                'attribute_id',
                'option_id'
              ])
                .prime('option_id', option.attribute_option_id)
                .prime('product_id', productId)
                .prime('attribute_id', attr.attribute_id)
                .prime('option_text', option.option_text)
                .execute(connection);
            })()
          )
        );
      } else if (attr.type === 'select') {
        const option = await select()
          .from('attribute_option')
          .where('attribute_option_id', '=', parseInt(attribute.value, 10))
          .load(connection);
        if (option === false) {
          // eslint-disable-next-line no-continue
          continue;
        }
        // Delete old option if any
        await del('product_attribute_value_index')
          .where('attribute_id', '=', attr.attribute_id)
          .and('product_id', '=', productId)
          .execute(connection);
        // Insert new option
        await insertOnUpdate('product_attribute_value_index', [
          'product_id',
          'attribute_id',
          'option_id'
        ])
          .prime('option_id', option.attribute_option_id)
          .prime('product_id', productId)
          .prime('attribute_id', attr.attribute_id)
          .prime('option_text', option.option_text)
          .execute(connection);
      } else {
        await insertOnUpdate('product_attribute_value_index', [
          'product_id',
          'attribute_id',
          'option_id'
        ])
          .prime('option_text', attribute.value)
          .execute(connection);
      }
    }
  }
}
