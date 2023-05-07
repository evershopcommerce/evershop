const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { OK } = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack, next) => {
  const query = select()
    .select('product_id', 'variant_product_id')
    .select('sku')
    .select('name')
    .select('status')
    .select('price')
    .select('qty')
    .select('product.image')
    .select('product_image.image', 'gallery')
    .from('product');

  query
    .leftJoin('product_image')
    .on('product.product_id', '=', 'product_image.product_image_product_id');

  query
    .leftJoin('product_description')
    .on(
      'product.product_id',
      '=',
      'product_description.product_description_product_id'
    );

  // Only return item that not assigned to any group
  query.where('variant_group_id', 'IS', null);

  if (request.query.keyword) {
    query
      .andWhere('name', 'LIKE', `%${request.query.keyword}%`)
      .or('sku', 'LIKE', `%${request.query.keyword}%`);
  }

  const results = await query.execute(pool);

  const variants = [];
  results.forEach((variant) => {
    const index = variants.findIndex(
      (v) => v.variant_product_id === variant.variant_product_id
    );
    if (index === -1) {
      variants.push({
        ...variant,
        image: {
          url: variant.image
        },
        images: [
          variant.image ? { url: variant.image, path: variant.image } : null,
          variant.gallery
            ? {
                url: variant.gallery,
                path: variant.gallery
              }
            : null
        ].filter((i) => i !== null)
      });
    } else {
      variants[index] = {
        ...variants[index],
        images: variants[index].images.concat({
          url: variant.gallery,
          path: variant.gallery
        })
      };
    }
  });

  for (let i = 0; i < variants.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    variants[i].attributes = JSON.parse(
      JSON.stringify(
        await select()
          .from('product_attribute_value_index')
          .where('product_id', '=', variants[i].variant_product_id)
          .execute(pool)
      )
    );
  }

  response.status(OK).json({
    data: { variants }
  });
};
