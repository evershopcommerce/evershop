const { insert, del, update } = require('../../../../../lib/mysql/query');
const { get } = require("../../../../../lib/util/get");
const sharp = require('sharp');
const config = require('config');
const path = require('path');
const { CONSTANTS } = require('../../../../../lib/util');

module.exports = async (request, response, stack) => {
  // Wait for product saving to be completed
  let promises = [stack["createProduct"], stack["updateProduct"]];
  let results = await Promise.all(promises);

  let productId;
  if (request.params.id) {
    productId = request.params.id;
  } else {
    productId = results["insertId"];
  }
  let connection = await stack["getConnection"];

  // Delete all old images
  await del("product_image")
    .where("product_image_product_id", "=", productId)
    .execute(connection);

  let gallery = get(request, "body.productMainImages", []);

  if (gallery.length > 0) {
    let mainImage = gallery.shift();
    let _path = path.join(CONSTANTS.PUBLICPATH, mainImage);
    let ext = path.extname(path.resolve(CONSTANTS.PUBLICPATH, mainImage));
    // Generate thumbnail
    await sharp(_path)
      .resize(
        config.get("catalog.product.image.thumbnail.width"),
        config.get("catalog.product.image.thumbnail.height"),
        { fit: "inside" }
      )
      .toFile(_path.replace(
        ext,
        "-thumb" + ext
      ));

    // Generate listing
    await sharp(_path)
      .resize(
        config.get("catalog.product.image.listing.width"),
        config.get("catalog.product.image.listing.height"),
        { fit: "inside" }
      )
      .toFile(_path.replace(
        ext,
        "-list" + ext
      ));

    // Generate single
    await sharp(_path)
      .resize(
        config.get("catalog.product.image.single.width"),
        config.get("catalog.product.image.single.height"),
        { fit: "inside" }
      )
      .toFile(_path.replace(
        ext,
        "-single" + ext
      ));

    await update("product")
      .given({ image: mainImage })
      .where("product_id", "=", productId)
      .execute(connection);
  }

  await Promise.all(gallery.map(f => (async () => {

    let _path = path.join(CONSTANTS.PUBLICPATH, f);
    let ext = path.extname(path.resolve(CONSTANTS.PUBLICPATH, f));

    // Generate thumbnail
    await sharp(_path)
      .resize(
        config.get("catalog.product.image.thumbnail.width"),
        config.get("catalog.product.image.thumbnail.height"),
        { fit: "inside" }
      )
      .toFile(_path.replace(
        ext,
        "-thumb" + ext
      ));

    // Generate listing
    await sharp(_path)
      .resize(
        config.get("catalog.product.image.listing.width"),
        config.get("catalog.product.image.listing.height"),
        { fit: "inside" }
      )
      .toFile(_path.replace(
        ext,
        "-list" + ext
      ));

    // Generate single
    await sharp(_path)
      .resize(
        config.get("catalog.product.image.single.width"),
        config.get("catalog.product.image.single.height"),
        { fit: "inside" }
      )
      .toFile(_path.replace(
        ext,
        "-single" + ext
      ));

    await insert("product_image")
      .given({ image: f })
      .prime("product_image_product_id", productId)
      .execute(connection);
  })()));
};
