/* eslint-disable no-lone-blocks */
const {
  insert, select, update, insertOnUpdate, del
} = require('@nodejscart/mysql-query-builder');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack) => {
  // Wait for product table to be updated. get productId
  const promises = [stack.createProduct, stack.updateProduct];
  const results = await Promise.all(promises);
  let productId;
  if (request.body.product_id) {
    productId = request.body.product_id;
  } else {
    productId = results[0].insertId;
  }
  const connection = await stack.getConnection;

  const product = await select().from('product').where('product_id', '=', productId).load(connection);

  // If "variant_group" is not available, do nothing
  if (request.body.variant_group === undefined) { return; }

  // No variants
  if (
    request.body.variant_group.variants === undefined
    || request.body.variant_group.variants.length === 0
  ) {
    // Remove variant group ID from main product if any
    // Update visibility
    await update('product')
      .prime('variant_group_id', null)
      .prime('visibility', 1)
      .where('product_id', '=', productId)
      .execute(connection);
    return;
  }

  // Make sure variant attribute are "select" attribute
  if (
    !request.body.variant_group.variant_group_attributes
    || Object.keys(request.body.variant_group.variant_group_attributes).length === 0
  ) { return; }

  const attributes = await select()
    .from('attribute')
    .where('attribute_id', 'IN', request.body.variant_group.variant_group_attributes)
    .andWhere('type', '=', 'select')
    .execute(connection);

  if (attributes.length < request.body.variant_group.variant_group_attributes.length) { return; }

  // If variant attributes are not assigned to current product attribute group. We do it now
  await Promise.all(attributes.map((a) => (async () => {
    await insertOnUpdate('attribute_group_link')
      .prime('attribute_id', a.attribute_id)
      .prime('group_id', parseInt(request.body.group_id, 10))
      .execute(connection);
  })()));

  // Maximum 5 attributes
  await del('variant_group').where('variant_group_id', '=', parseInt(`0${product.variant_group_id}`, 10)).execute(connection);
  const variantId = get(await insert('variant_group')
    .given({
      attribute_group_id: parseInt(request.body.group_id, 10),
      attribute_one: attributes[0].attribute_id,
      attribute_two: get(attributes[1], 'attribute_id'),
      attribute_three: get(attributes[2], 'attribute_id'),
      attribute_four: get(attributes[3], 'attribute_id'),
      attribute_five: get(attributes[4], 'attribute_id')
    })
    .execute(connection), 'insertId');

  await update('product')
    .prime('variant_group_id', variantId)
    .where('product_id', '=', productId)
    .execute(connection);

  // Validate and save variants
  const { variants } = request.body.variant_group;
  // console.log(variants);
  await Promise.all(Object.keys(variants).map((k) => (async () => {
    {
      const v = variants[k];
      // If this is the current SKU
      if (v.sku === product.sku) {

      } else {
        const options = await Promise.all(v.attributes.map((a) => (async () => await select()
          .from('attribute_option')
          .where('attribute_id', '=', a.attribute)
          .andWhere('attribute_option_id', '=', a.value)
          .load(connection))()));
        if (v.sku && options.find((o) => o === null) === undefined) {
          await saveVariant(
            productId,
            v.productId,
            v.sku,
            parseFloat(`0${v.price}`),
            parseInt(`0${v.qty}`, 10),
            v.visibility,
            options.map((o) => ({
              ...o, option_id: o.attribute_option_id, option_text: o.option_text
            })),
            request.body[k] || [],
            connection
          );
        }
      }
    }
  })()));
};

async function saveVariant(mainProductId, variantProductId, variantSku, variantPrice, variantQty, variantVisibility, variantAttributes, variantImages = [], connection) {
  // Copy master information
  let productId;
  // console.log(variantProductId);
  if (variantProductId) {
    productId = variantProductId;
    await update('product')
      .given(await select().from('product').where('product_id', '=', mainProductId).load(connection))
      .prime('sku', variantSku)
      .prime('price', variantPrice)
      .prime('qty', variantQty)
      .prime('image', null)
      .prime('visibility', variantVisibility)
      .where('product_id', '=', variantProductId)
      .execute(connection);
  } else {
    productId = get(await insertOnUpdate('product')
      .given(await select().from('product').where('product_id', '=', mainProductId).load(connection))
      .prime('sku', variantSku)
      .prime('price', variantPrice)
      .prime('qty', variantQty)
      .prime('image', null)
      .prime('visibility', variantVisibility)
      .execute(connection), 'insertId');
  }

  // Copy description
  await insertOnUpdate('product_description')
    .given(await select().from('product_description').where('product_description_product_id', '=', mainProductId).load(connection))
    .prime('product_description_product_id', productId)
    .execute(connection);

  // Save image gallery
  if (variantImages.length > 0) {
    await update('product')
      .given({ image: variantImages.shift() })
      .where('product_id', '=', productId)
      .execute(connection);
  }

  // Delete all old images
  await del('product_image')
    .where('product_image_product_id', '=', productId)
    .execute(connection);

  // Save new images
  await Promise.all(variantImages.map((f) => (async () => {
    await insert('product_image')
      .given({ image: f })
      .prime('product_image_product_id', productId)
      .execute(connection);
  })()));

  // Copy attribute
  const attributes = await select()
    .from('product_attribute_value_index')
    .where('product_id', '=', mainProductId)
    .execute(connection);

  await Promise.all(attributes.map((a) => (async () => {
    {
      const va = variantAttributes.find((va) => parseInt(va.attribute_id) === parseInt(a.attribute_id));
      if (va) {
        await insertOnUpdate('product_attribute_value_index')
          .given(va)
          .prime('product_id', productId)
          .execute(connection);
      } else {
        await insertOnUpdate('product_attribute_value_index')
          .given(a)
          .prime('product_id', productId)
          .execute(connection);
      }
    }
  })()));
}
