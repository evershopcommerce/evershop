import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // rename the image column in the product_image table to origin_image
  await execute(
    connection,
    `ALTER TABLE product_image RENAME COLUMN image TO origin_image`
  );

  // Add  columns 'thumb_image', 'listing_image', 'single_image', 'is_main' to the product_image table if not exist
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

  // Create a trigger to add an event to the event table when a product image is created
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

  await execute(
    connection,
    `CREATE TRIGGER "PRODUCT_IMAGE_ADDED"
      AFTER INSERT ON product_image
      FOR EACH ROW
      EXECUTE PROCEDURE product_image_insert_trigger();`
  );

  // Update all the column origin_image in the product_image table to add the '/assets' prefix
  await execute(
    connection,
    `UPDATE product_image SET origin_image = CONCAT('/assets', origin_image)`
  );

  // Add event to the event table for all the product images
  await execute(
    connection,
    `INSERT INTO event (name, data)
      SELECT 'product_image_added', row_to_json(product_image)
      FROM product_image`
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
