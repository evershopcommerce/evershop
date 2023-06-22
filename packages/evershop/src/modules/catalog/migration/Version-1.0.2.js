const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Add a category_id column to the product table
  await execute(
    connection,
    `ALTER TABLE product ADD COLUMN category_id INT DEFAULT NULL;`
  );

  // Add a foreign key constraint to the category_id column
  await execute(
    connection,
    `ALTER TABLE product ADD CONSTRAINT "PRODUCT_CATEGORY_ID_CONSTRAINT" FOREIGN KEY ("category_id") REFERENCES "category" ("category_id") ON DELETE SET NULL;`
  );

  // Get 1 category from the product_category table and update product table with according category_id
  await execute(
    connection,
    `UPDATE product SET category_id = (SELECT category_id FROM product_category WHERE product_id = product.product_id LIMIT 1);`
  );

  // Delete the product_category table
  await execute(connection, `DROP TABLE product_category;`);

  // Create a function to build url_key from the name if the url_key is not provided. This function replace whitespace with dash and remove all special characters
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION build_url_key() RETURNS TRIGGER AS $$
    DECLARE
      url_key TEXT;
    BEGIN
      IF(NEW.url_key IS NULL) THEN
        url_key = regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g');
        url_key = regexp_replace(url_key, '^-|-$', '', 'g');
        url_key = lower(url_key);
        url_key = url_key || '-' || (SELECT floor(random() * 1000000)::text);
        NEW.url_key = url_key;
      ELSE
        IF (NEW.url_key ~ '[/\\#]') THEN
          RAISE EXCEPTION 'Invalid url_key: %', NEW.url_key;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to build the url_key from the name if the url_key is not provided
  await execute(
    connection,
    `CREATE TRIGGER "BUILD_CATEGORY_URL_KEY_TRIGGER"
    BEFORE INSERT OR UPDATE ON category_description
    FOR EACH ROW
    EXECUTE PROCEDURE build_url_key();`
  );

  // Create a trigger to build the url_key from the name if the url_key is not provided
  await execute(
    connection,
    `CREATE TRIGGER "BUILD_PRODUCT_URL_KEY_TRIGGER"
    BEFORE INSERT OR UPDATE ON product_description
    FOR EACH ROW
    EXECUTE PROCEDURE build_url_key();`
  );

  // Create a url_rewrite table to store the url rewrite rules
  await execute(
    connection,
    `CREATE TABLE url_rewrite (
      "url_rewrite_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "language" varchar NOT NULL DEFAULT 'en',
      "request_path" varchar NOT NULL,
      "target_path" varchar NOT NULL,
      "entity_uuid" UUID DEFAULT NULL,
      "entity_type" varchar DEFAULT NULL,
      CONSTRAINT "URL_REWRITE_PATH_UNIQUE" UNIQUE ("language", "entity_uuid")
    )`
  );

  // Create a function to add event to the event table after a category is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_category_created_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('category_created', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a category is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CATEGORY_CREATED_EVENT_TRIGGER"
    AFTER INSERT ON category
    FOR EACH ROW
    EXECUTE PROCEDURE add_category_created_event();`
  );

  // Create a function to add event to the event table after a category is updated
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_category_updated_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('category_updated', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a category is updated
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CATEGORY_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON category
    FOR EACH ROW
    EXECUTE PROCEDURE add_category_updated_event();`
  );

  // Create a function to add event to the event table after a category is deleted
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_category_deleted_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('category_deleted', row_to_json(OLD));
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a category is deleted
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CATEGORY_DELETED_EVENT_TRIGGER"
    AFTER DELETE ON category
    FOR EACH ROW
    EXECUTE PROCEDURE add_category_deleted_event();`
  );

  // Create a function to add event to the event table after a product is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_created_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('product_created', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a product is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_PRODUCT_CREATED_EVENT_TRIGGER"
    AFTER INSERT ON product
    FOR EACH ROW
    EXECUTE PROCEDURE add_product_created_event();`
  );

  // Create a function to add event to the event table after a product is updated
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_updated_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('product_updated', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a product is updated
  await execute(
    connection,
    `CREATE TRIGGER "ADD_PRODUCT_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON product
    FOR EACH ROW
    EXECUTE PROCEDURE add_product_updated_event();`
  );

  // Create a function to add event to the event table after a product is deleted
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_deleted_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('product_deleted', row_to_json(OLD));
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a product is deleted
  await execute(
    connection,
    `CREATE TRIGGER "ADD_PRODUCT_DELETED_EVENT_TRIGGER"
    AFTER DELETE ON product
    FOR EACH ROW
    EXECUTE PROCEDURE add_product_deleted_event();`
  );

  // Create a product_inventory table to store the inventory of the product and move the inventory from the product table to this table
  await execute(
    connection,
    `CREATE TABLE product_inventory (
      "product_inventory_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "product_inventory_product_id" INT NOT NULL,
      "qty" INT NOT NULL DEFAULT 0,
      "manage_stock" BOOLEAN NOT NULL DEFAULT false,
      "stock_availability" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "PRODUCT_INVENTORY_PRODUCT_ID_CONSTANTSRAINT" FOREIGN KEY ("product_inventory_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
      CONSTRAINT "PRODUCT_INVENTORY_PRODUCT_ID_UNIQUE" UNIQUE ("product_inventory_product_id")
    )`
  );

  // Copy the inventory from the product table to the product_inventory table
  await execute(
    connection,
    `INSERT INTO product_inventory (product_inventory_product_id, qty, manage_stock, stock_availability)
    SELECT product_id, qty, manage_stock, stock_availability FROM product;`
  );

  // Create a function to delete all sub categories of a category when the category is deleted
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION delete_sub_categories() RETURNS TRIGGER AS $$
    DECLARE
      sub_categories RECORD;
    BEGIN
      FOR sub_categories IN
        WITH RECURSIVE sub_categories AS (
          SELECT * FROM category WHERE parent_id = OLD.category_id
          UNION
          SELECT c.* FROM category c
          INNER JOIN sub_categories sc ON c.parent_id = sc.category_id
        ) SELECT * FROM sub_categories
      LOOP
        DELETE FROM category WHERE category_id = sub_categories.category_id;
      END LOOP;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to delete all sub categories of a category when the category is deleted, this trigger will be executed after the category is deleted, make sure to avoid infinite loop
  await execute(
    connection,
    `CREATE TRIGGER "DELETE_SUB_CATEGORIES_TRIGGER"
    AFTER DELETE ON category
    FOR EACH ROW
    EXECUTE PROCEDURE delete_sub_categories();`
  );

  // Load all categories and add a category_updated event to the event table
  await execute(
    connection,
    `INSERT INTO event (name, data) SELECT 'category_updated', row_to_json(category) FROM category;`
  );

  // Load all products and add a product_updated event to the event table
  await execute(
    connection,
    `INSERT INTO event (name, data) SELECT 'product_updated', row_to_json(product) FROM product;`
  );
};
