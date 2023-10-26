const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `ALTER TABLE product_image RENAME COLUMN image TO origin_image`
  );

  // Add  columns 'thumb', 'listing', 'single', 'is_main' to the product_image table if not exist
  await execute(
    connection,
    `ALTER TABLE product_image
      ADD COLUMN IF NOT EXISTS thumb_image text,
      ADD COLUMN IF NOT EXISTS listing_image text,
      ADD COLUMN IF NOT EXISTS single_image text,
      ADD COLUMN IF NOT EXISTS is_main boolean DEFAULT false`
  );

  // Drop the uuid column from the product_image table
  await execute(connection, `ALTER TABLE product_image DROP COLUMN uuid`);

  // Build the image variants base on the main image, we have 3 variants: thumb, listing, single. We can build the variant json object by taking the
  // main image and replace the file name with the variant name before the extension. For example: main image is /assets/images/1.jpg, we can build the
  // variant json object like this: { thumb: '/assets/images/1-thumb.jpg', listing: '/assets/images/1-listing.jpg', single: '/assets/images/1-single.jpg' }
  // Becarefull with the replacement because '.' can be a part of the name, not just the extension. For example: /assets/images/1.1.jpg. Make sure we
  // only replace the last '.' in the string.

  // Update the variant column in the product_image table with the variant json object

  // await execute(
  //   connection,
  //   `UPDATE product_image
  //     SET variant = jsonb_build_object(
  //       'thumb', CONCAT(SUBSTRING(image, 1, LENGTH(image) - LENGTH(SPLIT_PART(REVERSE(image), '.', 1)) - 1), '-thumb.', SPLIT_PART(REVERSE(image), '.', 1)),
  //       'listing', CONCAT(SUBSTRING(image, 1, LENGTH(image) - LENGTH(SPLIT_PART(REVERSE(image), '.', 1)) - 1), '-listing.', SPLIT_PART(REVERSE(image), '.', 1)),
  //       'single', CONCAT(SUBSTRING(image, 1, LENGTH(image) - LENGTH(SPLIT_PART(REVERSE(image), '.', 1)) - 1), '-single.', SPLIT_PART(REVERSE(image), '.', 1))
  //     )
  //     WHERE is_main = true`
  // );

  // Create a trigger to add an event to the event table when a product image is created and type is 'origin'
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION product_image_insert_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO event (name, data)
        VALUES ('product_image_added', row_to_json(NEW));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add an event to the event table when a product image is created and type is 'origin'
  await execute(
    connection,
    `CREATE TRIGGER "PRODUCT_IMAGE_ADDED"
      AFTER INSERT ON product_image
      FOR EACH ROW
      EXECUTE PROCEDURE product_image_insert_trigger();`
  );

  await execute(
    connection,
    `INSERT INTO product_image (product_image_product_id, origin_image, is_main)
      SELECT product_id, CONCAT('/assets', image), true
      FROM product
      WHERE image IS NOT NULL`
  );
  // Drop the image column from product table
  await execute(connection, `ALTER TABLE product DROP COLUMN image`);
};
