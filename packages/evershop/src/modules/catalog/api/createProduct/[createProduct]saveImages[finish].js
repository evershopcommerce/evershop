const { insert } = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, deledate) => {
  const gallery = get(request, 'body.images', []);

  // Wait for product saving to be completed
  const result = await deledate.createProduct;

  const productId = result.insertId;
  const connection = await deledate.getConnection;
  // eslint-disable-next-line no-useless-catch
  try {
    await Promise.all(
      gallery.map((f, index) =>
        (async () => {
          await insert('product_image')
            .given({ origin_image: f, is_main: index === 0 })
            .prime('product_image_product_id', productId)
            .execute(connection);
        })()
      )
    );
  } catch (e) {
    throw e;
  }
};
