const { select } = require('@evershop/mysql-query-builder');
const uniqid = require('uniqid');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async (request, response) => {
  const productId = request.params.id;
  let images = await select('image')
    .from('product_image')
    .where('product_image_product_id', '=', productId)
    .execute(pool);

  images = images.map((i) => ({ path: i.image, url: buildUrl('adminStaticAsset', [i.image]), id: uniqid() }));

  const mainImage = await select('image')
    .from('product')
    .where('product_id', '=', productId)
    .load(pool);
  if (mainImage.image) { images.unshift({ url: buildUrl('adminStaticAsset', [mainImage.image]), path: mainImage.image, id: uniqid() }); }
  assign(response.context, { product: { images } });
};
