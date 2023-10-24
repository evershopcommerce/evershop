const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Add 1 column 'type' to the product_image table
  await execute(
    connection,
    `ALTER TABLE product_image
      ADD COLUMN variant jsonb`
  );

  // Add 1 column 'is_main' to the product_image table
  await execute(
    connection,
    `ALTER TABLE product_image
      ADD COLUMN is_main boolean DEFAULT false`
  );

  // Add a unique constraint to the product_image table to make sure there is only one main image for a product
  await execute(
    connection,
    `ALTER TABLE product_image
      ADD CONSTRAINT PRODUCT_MAIN_IMAGE_UNIQUE UNIQUE (product_image_product_id, is_main)`
  );

  // Drop the uuid column from the product_image table
  await execute(connection, `ALTER TABLE product_image DROP COLUMN uuid`);

  await execute(
    connection,
    `INSERT INTO product_image (product_image_product_id, image, is_main)
      SELECT product_id, CONCAT('/assets', image), true
      FROM product
      WHERE image IS NOT NULL`
  );

  // Drop the image column from product table
  await execute(connection, `ALTER TABLE product DROP COLUMN image`);

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
};
