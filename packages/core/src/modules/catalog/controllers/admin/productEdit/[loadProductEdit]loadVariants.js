const { select } = require('@nodejscart/mysql-query-builder');
const uniqid = require('uniqid');
const { assign } = require('../../../../../lib/util/assign');
const { pool } = require('../../../../../lib/mysql/connection');
const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async (request, response) => {
  // Do nothing if this product does not belong to a variant group
  if (!get(response, 'context.product.variant_group_id')) { return; }
  const query = select()
    .select('product_id', 'variant_product_id')
    .select('sku')
    .select('status')
    .select('visibility')
    .select('price')
    .select('qty')
    .select('product.`image`')
    .select('product_image.`image`', 'gallery')
    .from('product');

  query.leftJoin('product_image')
    .on('product.`product_id`', '=', 'product_image.`product_image_product_id`');

  query.where('variant_group_id', '=', get(response, 'context.product.variant_group_id'))
    .andWhere('product_id', '<>', get(response, 'context.product.product_id'));

  const results = await query.execute(pool);

  const variants = [];
  results.forEach((variant) => {
    const index = variants.findIndex((v) => v.variant_product_id === variant.variant_product_id);
    if (index === -1) {
      variants.push({ ...variant, images: [variant.image ? { url: buildUrl('adminStaticAsset', [variant.image]), path: variant.image, id: uniqid() } : null, variant.gallery ? { url: buildUrl('adminStaticAsset', [variant.gallery]), path: variant.gallery, id: uniqid() } : null].filter((i) => i !== null) });
    } else {
      variants[index] = { ...variants[index], images: variants[index].images.concat({ url: buildUrl('adminStaticAsset', [variant.gallery]), path: variant.gallery, id: uniqid() }) };
    }
  });

  for (let i = 0; i < variants.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    variants[i].attributes = JSON.parse(JSON.stringify(await select()
      .from('product_attribute_value_index')
      .where('product_id', '=', variants[i].variant_product_id)
      .execute(pool)));
  }

  assign(response.context, {
    product: {
      variants: variants.map((v) => ({
        ...v,
        id: `id${uniqid()}`
      }))
    }
  });

  const attributes = await select('attribute_id')
    .select('attribute_name')
    .from('attribute')
    .where(
      'attribute_id',
      'IN',
      Object.values(
        await select('attribute_one')
          .from('variant_group')
          .select('attribute_two')
          .select('attribute_three')
          .select('attribute_four')
          .select('attribute_five')
          .where('variant_group_id', '=', get(response, 'context.product.variant_group_id'))
          .load(pool)
      )
    )
    .execute(pool);

  assign(response.context, {
    product: {
      variantAttributes: await Promise.all(attributes.map(async (a) => {
        const options = await select()
          .from('attribute_option')
          .where('`attribute_id`', '=', a.attribute_id).execute(pool);
        return { ...a, options: options.map((o) => ({ ...o })) };
      }))
    }
  });
};
