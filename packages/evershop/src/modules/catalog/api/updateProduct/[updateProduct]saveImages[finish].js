const {
  insert,
  del,
  select,
  update
} = require('@evershop/postgres-query-builder');
const { debug } = require('@evershop/evershop/src/lib/log/debuger');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const gallery = get(request, 'body.images', undefined);
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  if (Array.isArray(gallery) && gallery.length === 0) {
    // Delete all images
    await del('product_image')
      .where('product_image_product_id', '=', productId)
      .execute(connection);
  }
  if (Array.isArray(gallery) && gallery.length > 0) {
    // eslint-disable-next-line no-useless-catch
    try {
      // Delete all images that not in the gallery anymore
      await del('product_image')
        .where('product_image_product_id', '=', productId)
        .and('origin_image', 'NOT IN', gallery)
        .execute(connection);
      await Promise.all(
        gallery.map((f, index) =>
          (async () => {
            const image = await select()
              .from('product_image')
              .where('product_image_product_id', '=', productId)
              .and('origin_image', '=', f)
              .load(connection);

            if (!image) {
              await insert('product_image')
                .given({
                  product_image_product_id: productId,
                  origin_image: f,
                  is_main: index === 0
                })
                .execute(connection);
            } else {
              await update('product_image')
                .given({ is_main: index === 0 })
                .where('product_image_product_id', '=', productId)
                .and('origin_image', '=', f)
                .execute(connection);
            }
          })()
        )
      );
    } catch (e) {
      debug('critical', e);
      throw e;
    }
  }
};
