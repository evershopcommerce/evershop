import { execute, insert } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "attribute" (
  "attribute_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "attribute_code" varchar NOT NULL,
  "attribute_name" varchar NOT NULL,
  "type" varchar NOT NULL,
  "is_required" boolean NOT NULL DEFAULT FALSE,
  "display_on_frontend" boolean NOT NULL DEFAULT FALSE,
  "sort_order" INT NOT NULL DEFAULT 0,
  "is_filterable" boolean NOT NULL DEFAULT FALSE,
  CONSTRAINT "ATTRIBUTE_CODE_UNIQUE" UNIQUE ("attribute_code"),
  CONSTRAINT "ATTRIBUTE_CODE_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  const color = await insert('attribute')
    .given({
      attribute_code: 'color',
      attribute_name: 'Color',
      type: 'select',
      is_required: 0,
      display_on_frontend: 1,
      is_filterable: 1
    })
    .execute(connection);
  const size = await insert('attribute')
    .given({
      attribute_code: 'size',
      attribute_name: 'Size',
      type: 'select',
      is_required: 0,
      display_on_frontend: 1,
      is_filterable: 1
    })
    .execute(connection);
  await execute(
    connection,
    `CREATE TABLE "attribute_option" (
  "attribute_option_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "attribute_id" INT NOT NULL,
  "attribute_code" varchar NOT NULL,
  "option_text" varchar NOT NULL,
  CONSTRAINT "ATTRIBUTE_OPTION_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_ATTRIBUTE_OPTION" FOREIGN KEY ("attribute_id") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE
)`
  );

  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_OPTION" ON "attribute_option" ("attribute_id")`
  );

  await insert('attribute_option')
    .given({
      attribute_id: color.insertId,
      attribute_code: 'color',
      option_text: 'White'
    })
    .execute(connection);

  await insert('attribute_option')
    .given({
      attribute_id: color.insertId,
      attribute_code: 'color',
      option_text: 'Black'
    })
    .execute(connection);

  await insert('attribute_option')
    .given({
      attribute_id: color.insertId,
      attribute_code: 'color',
      option_text: 'Yellow'
    })
    .execute(connection);

  await insert('attribute_option')
    .given({
      attribute_id: size.insertId,
      attribute_code: 'size',
      option_text: 'XXL'
    })
    .execute(connection);

  await insert('attribute_option')
    .given({
      attribute_id: size.insertId,
      attribute_code: 'size',
      option_text: 'XL'
    })
    .execute(connection);

  await insert('attribute_option')
    .given({
      attribute_id: size.insertId,
      attribute_code: 'size',
      option_text: 'SM'
    })
    .execute(connection);

  await execute(
    connection,
    `CREATE TABLE "attribute_group" (
  "attribute_group_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "group_name" text NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ATTRIBUTE_GROUP_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  const defaultGroup = await insert('attribute_group')
    .given({ group_name: 'Default' })
    .execute(connection);

  await execute(
    connection,
    `CREATE TABLE "attribute_group_link" (
  "attribute_group_link_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "attribute_id" INT NOT NULL,
  "group_id" INT NOT NULL,
  CONSTRAINT "ATTRIBUTE_GROUP_LINK_UNIQUE" UNIQUE ("attribute_id","group_id"),
  CONSTRAINT "FK_ATTRIBUTE_LINK" FOREIGN KEY ("attribute_id") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FK_GROUP_LINK" FOREIGN KEY ("group_id") REFERENCES "attribute_group" ("attribute_group_id") ON DELETE CASCADE
)`
  );

  await execute(
    connection,
    `CREATE INDEX "FK_GROUP_LINK" ON "attribute_group_link" ("group_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_LINK" ON "attribute_group_link" ("attribute_id")`
  );

  await insert('attribute_group_link')
    .given({
      group_id: defaultGroup.insertId,
      attribute_id: color.insertId
    })
    .execute(connection);
  await insert('attribute_group_link')
    .given({
      group_id: defaultGroup.insertId,
      attribute_id: size.insertId
    })
    .execute(connection);

  await execute(
    connection,
    `CREATE TABLE "variant_group" (
  "variant_group_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "attribute_group_id" INT NOT NULL,
  "attribute_one" INT DEFAULT NULL,
  "attribute_two" INT DEFAULT NULL,
  "attribute_three" INT DEFAULT NULL,
  "attribute_four" INT DEFAULT NULL,
  "attribute_five" INT DEFAULT NULL,
  "visibility" boolean NOT NULL DEFAULT FALSE,
  CONSTRAINT "VARIANT_GROUP_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_ATTRIBUTE_GROUP_VARIANT" FOREIGN KEY ("attribute_group_id") REFERENCES "attribute_group" ("attribute_group_id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_ATTRIBUTE_VARIANT_FIVE" FOREIGN KEY ("attribute_five") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_ATTRIBUTE_VARIANT_FOUR" FOREIGN KEY ("attribute_four") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_ATTRIBUTE_VARIANT_ONE" FOREIGN KEY ("attribute_one") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_ATTRIBUTE_VARIANT_THREE" FOREIGN KEY ("attribute_three") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_ATTRIBUTE_VARIANT_TWO" FOREIGN KEY ("attribute_two") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE ON UPDATE NO ACTION
)`
  );

  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_VARIANT_ONE" ON "variant_group" ("attribute_one")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_VARIANT_TWO" ON "variant_group" ("attribute_two")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_VARIANT_THREE" ON "variant_group" ("attribute_three")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_VARIANT_FOUR" ON "variant_group" ("attribute_four")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_VARIANT_FIVE" ON "variant_group" ("attribute_five")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_GROUP_VARIANT" ON "variant_group" ("attribute_group_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "product" (
  "product_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "type" varchar NOT NULL DEFAULT 'simple',
  "variant_group_id" INT DEFAULT NULL,
  "visibility" boolean NOT NULL DEFAULT TRUE,
  "group_id" INT DEFAULT 1,
  "image" varchar DEFAULT NULL,
  "sku" varchar NOT NULL,
  "price" decimal(12,4) NOT NULL,
  "qty" INT NOT NULL,
  "weight" decimal(12,4) DEFAULT NULL,
  "manage_stock" boolean NOT NULL,
  "stock_availability" boolean NOT NULL,
  "tax_class" smallint DEFAULT NULL,
  "status" boolean NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PRODUCT_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "PRODUCT_SKU_UNIQUE" UNIQUE ("sku"),
  CONSTRAINT "UNSIGNED_PRICE" CHECK(price >= 0),
  CONSTRAINT "UNSIGNED_WEIGHT" CHECK(weight >= 0),
  CONSTRAINT "FK_PRODUCT_ATTRIBUTE_GROUP" FOREIGN KEY ("group_id") REFERENCES "attribute_group" ("attribute_group_id") ON DELETE SET NULL,
  CONSTRAINT "FK_PRODUCT_VARIANT_GROUP" FOREIGN KEY ("variant_group_id") REFERENCES "variant_group" ("variant_group_id") ON DELETE SET NULL
)`
  );

  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_ATTRIBUTE_GROUP" ON "product" ("group_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_VARIANT_GROUP" ON "product" ("variant_group_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "product_attribute_value_index" (
  "product_attribute_value_index_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "product_id" INT NOT NULL,
  "attribute_id" INT NOT NULL,
  "option_id" INT DEFAULT NULL,
  "option_text" text DEFAULT NULL,
  CONSTRAINT "PRODUCT_ATTRIBUTE_VALUE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "OPTION_VALUE_UNIQUE" UNIQUE ("product_id","attribute_id","option_id"),
  CONSTRAINT "FK_ATTRIBUTE_OPTION_VALUE_LINK" FOREIGN KEY ("option_id") REFERENCES "attribute_option" ("attribute_option_id") ON DELETE CASCADE,
  CONSTRAINT "FK_ATTRIBUTE_VALUE_LINK" FOREIGN KEY ("attribute_id") REFERENCES "attribute" ("attribute_id") ON DELETE CASCADE,
  CONSTRAINT "FK_PRODUCT_ATTRIBUTE_LINK" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_VALUE_LINK" ON "product_attribute_value_index" ("attribute_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ATTRIBUTE_OPTION_VALUE_LINK" ON "product_attribute_value_index" ("option_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_ATTRIBUTE_LINK" ON "product_attribute_value_index" ("product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "product_custom_option" (
  "product_custom_option_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "product_custom_option_product_id" INT NOT NULL,
  "option_name" varchar NOT NULL,
  "option_type" varchar NOT NULL,
  "is_required" boolean NOT NULL DEFAULT FALSE,
  "sort_order" INT DEFAULT NULL,
  CONSTRAINT "PRODUCT_CUSTOM_OPTION_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_PRODUCT_CUSTOM_OPTION" FOREIGN KEY ("product_custom_option_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_CUSTOM_OPTION" ON "product_custom_option" ("product_custom_option_product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "product_custom_option_value" (
  "product_custom_option_value_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "option_id" INT NOT NULL,
  "extra_price" decimal(12,4) DEFAULT NULL,
  "sort_order" INT DEFAULT NULL,
  "value" varchar NOT NULL,
  CONSTRAINT "PRODUCT_CUSTOM_OPTION_VALUE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_CUSTOM_OPTION_VALUE" FOREIGN KEY ("option_id") REFERENCES "product_custom_option" ("product_custom_option_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CUSTOM_OPTION_VALUE" ON "product_custom_option_value" ("option_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "product_description" (
  "product_description_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "product_description_product_id" INT NOT NULL,
  "name" varchar NOT NULL,
  "description" text DEFAULT NULL,
  "short_description" text DEFAULT NULL,
  "url_key" varchar NOT NULL,
  "meta_title" text DEFAULT NULL,
  "meta_description" text DEFAULT NULL,
  "meta_keywords" text DEFAULT NULL,
  CONSTRAINT "PRODUCT_ID_UNIQUE" UNIQUE ("product_description_product_id"),
  CONSTRAINT "PRODUCT_URL_KEY_UNIQUE" UNIQUE ("url_key"),
  CONSTRAINT "FK_PRODUCT_DESCRIPTION" FOREIGN KEY ("product_description_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_DESCRIPTION" ON "product_description" ("product_description_product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "product_image" (
  "product_image_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "product_image_product_id" INT NOT NULL,
  "image" varchar NOT NULL,
  CONSTRAINT "PRODUCT_IMAGE_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_PRODUCT_IMAGE_LINK" FOREIGN KEY ("product_image_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_IMAGE_LINK" ON "product_image" ("product_image_product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "category" (
  "category_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "status" boolean NOT NULL,
  "parent_id" INT DEFAULT NULL,
  "include_in_nav" boolean NOT NULL,
  "position" smallint DEFAULT NULL,
  "show_products" boolean DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   CONSTRAINT "CATEGORY_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  await execute(
    connection,
    `CREATE TABLE "product_category" (
  "product_category_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "category_id" INT NOT NULL,
  "product_id" INT NOT NULL,
  CONSTRAINT "PRODUCT_CATEGORY_UNIQUE" UNIQUE ("category_id","product_id"),
  CONSTRAINT "FK_CATEGORY_PRODUCT_LINK" FOREIGN KEY ("category_id") REFERENCES "category" ("category_id") ON DELETE CASCADE,
  CONSTRAINT "FK_PRODUCT_CATEGORY_LINK" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CATEGORY_PRODUCT_LINK" ON "product_category" ("category_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_CATEGORY_LINK" ON "product_category" ("product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "category_description" (
  "category_description_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "category_description_category_id" INT NOT NULL,
  "name" varchar NOT NULL,
  "short_description" text DEFAULT NULL,
  "description" text DEFAULT NULL,
  "image" varchar DEFAULT NULL,
  "meta_title" text DEFAULT NULL,
  "meta_keywords" text DEFAULT NULL,
  "meta_description" text DEFAULT NULL,
  "url_key" varchar NOT NULL,
  CONSTRAINT "CATEGORY_ID_UNIQUE" UNIQUE ("category_description_category_id"),
  CONSTRAINT "CATEGORY_URL_KEY_UNIQUE" UNIQUE ("url_key"),
  CONSTRAINT "FK_CATEGORY_DESCRIPTION" FOREIGN KEY ("category_description_category_id") REFERENCES "category" ("category_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CATEGORY_DESCRIPTION" ON "category_description" ("category_description_category_id")`
  );

  // Create 3 default categories, Kids, Men, Women
  const kids = await insert('category')
    .given({
      status: 1,
      include_in_nav: 1
    })
    .execute(connection);

  await insert('category_description')
    .given({
      category_description_category_id: kids.insertId,
      name: 'Kids',
      url_key: 'kids',
      meta_title: 'Kids',
      meta_description: 'Kids',
      meta_keywords: 'Kids',
      description: 'Kids'
    })
    .execute(connection);

  const women = await insert('category')
    .given({
      status: 1,
      include_in_nav: 1
    })
    .execute(connection);

  await insert('category_description')
    .given({
      category_description_category_id: women.insertId,
      name: 'Women',
      url_key: 'women',
      meta_title: 'Women',
      meta_description: 'Women',
      meta_keywords: 'Women',
      description: 'Women'
    })
    .execute(connection);

  const men = await insert('category')
    .given({
      status: 1,
      include_in_nav: 1
    })
    .execute(connection);

  await insert('category_description')
    .given({
      category_description_category_id: men.insertId,
      name: 'Men',
      url_key: 'men',
      meta_title: 'Men',
      meta_description: 'Men',
      meta_keywords: 'Men',
      description: 'Men'
    })
    .execute(connection);

  // COLLECTION
  await execute(
    connection,
    `CREATE TABLE "collection" (
  "collection_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "name" varchar NOT NULL,
  "description" text DEFAULT NULL,
  "code" varchar NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COLLECTION_CODE_UNIQUE" UNIQUE ("code"),
  CONSTRAINT "COLLECTION_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  await execute(
    connection,
    `CREATE TABLE "product_collection" (
  "product_collection_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "collection_id" INT NOT NULL,
  "product_id" INT NOT NULL,
  CONSTRAINT "PRODUCT_COLLECTION_UNIQUE" UNIQUE ("collection_id","product_id"),
  CONSTRAINT "FK_COLLECTION_PRODUCT_LINK" FOREIGN KEY ("collection_id") REFERENCES "collection" ("collection_id") ON DELETE CASCADE,
  CONSTRAINT "FK_PRODUCT_COLLECTION_LINK" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_COLLECTION_PRODUCT_LINK" ON "product_collection" ("collection_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PRODUCT_COLLECTION_LINK" ON "product_collection" ("product_id")`
  );

  /* CREATE SOME TRIGGERS */
  // Prevent deleting a default attribute group
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_delete_default_attribute_group()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.attribute_group_id = 1 THEN
          RAISE EXCEPTION 'Cannot delete default attribute group';
        END IF;
        RETURN OLD;
      END;
      $$`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_DELETING_THE_DEFAULT_ATTRIBUTE_GROUP"
        BEFORE DELETE ON attribute_group
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_delete_default_attribute_group();`
  );

  // Prevent changing product attribute group if product has variants
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_change_attribute_group()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.group_id != NEW.group_id AND OLD.variant_group_id IS NOT NULL THEN
          RAISE EXCEPTION 'Cannot change attribute group of product with variants';
        END IF;
        RETURN NEW;
      END;
      $$`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_CHANGING_ATTRIBUTE_GROUP_OF_PRODUCT_WITH_VARIANTS"
        BEFORE UPDATE ON product
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_change_attribute_group();`
  );

  //  Delete product attribute value and variant group when attribute is removed from group
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION remove_attribute_from_group()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        DELETE FROM product_attribute_value_index WHERE product_attribute_value_index.attribute_id = OLD.attribute_id AND product_attribute_value_index.product_id IN (SELECT product.product_id FROM product WHERE product.group_id = OLD.group_id);
        DELETE FROM variant_group WHERE variant_group.attribute_group_id = OLD.group_id AND (variant_group.attribute_one = OLD.attribute_id OR variant_group.attribute_two = OLD.attribute_id OR variant_group.attribute_three = OLD.attribute_id OR variant_group.attribute_four = OLD.attribute_id OR variant_group.attribute_five = OLD.attribute_id);
        RETURN OLD;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_AFTER_REMOVE_ATTRIBUTE_FROM_GROUP" AFTER DELETE ON "attribute_group_link"
     FOR EACH ROW 
     EXECUTE PROCEDURE remove_attribute_from_group();
    `
  );

  //  Update product attribute value option text when option is updated
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION update_product_attribute_option_value_text()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        UPDATE "product_attribute_value_index" SET "option_text" = NEW.option_text
        WHERE "product_attribute_value_index".option_id = NEW.attribute_option_id AND "product_attribute_value_index".attribute_id = NEW.attribute_id;
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_AFTER_ATTRIBUTE_OPTION_UPDATE" AFTER UPDATE ON "attribute_option" FOR EACH ROW
    EXECUTE PROCEDURE update_product_attribute_option_value_text();
    `
  );

  //  Delete product attribute value index after option is deleted
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION delete_product_attribute_value_index()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        DELETE FROM "product_attribute_value_index" WHERE "product_attribute_value_index".option_id = OLD.attribute_option_id AND "product_attribute_value_index"."attribute_id" = OLD.attribute_id;
        RETURN OLD;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_AFTER_DELETE_ATTRIBUTE_OPTION" AFTER DELETE ON "attribute_option" FOR EACH ROW
    EXECUTE PROCEDURE delete_product_attribute_value_index();
    `
  );

  // Update variant group visibility after new product is added
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION update_variant_group_visibility()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        UPDATE "variant_group" SET visibility = (SELECT bool_or(visibility) FROM "product" WHERE "product"."variant_group_id" = NEW.variant_group_id AND "product"."status" = TRUE) WHERE "variant_group"."variant_group_id" = NEW.variant_group_id;
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE CONSTRAINT TRIGGER "TRIGGER_AFTER_INSERT_PRODUCT" AFTER INSERT ON "product" 
    DEFERRABLE INITIALLY IMMEDIATE
    FOR EACH ROW
    EXECUTE PROCEDURE update_variant_group_visibility();`
  );

  // Update product attribute index, variant group visibility and product visibility after product is updated
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION update_attribute_index_and_variant_group_visibility()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        DELETE FROM "product_attribute_value_index"
        WHERE "product_attribute_value_index"."product_id" = NEW.product_id 
        AND "product_attribute_value_index"."attribute_id" NOT IN (SELECT "attribute_group_link"."attribute_id" FROM "attribute_group_link" WHERE "attribute_group_link"."group_id" = NEW.group_id);
        UPDATE "variant_group" SET visibility = (SELECT bool_or(visibility) FROM "product" WHERE "product"."variant_group_id" = NEW.variant_group_id AND "product"."status" = TRUE GROUP BY "product"."variant_group_id") WHERE "variant_group"."variant_group_id" = NEW.variant_group_id;
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE CONSTRAINT TRIGGER "TRIGGER_PRODUCT_AFTER_UPDATE" AFTER UPDATE ON "product"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE PROCEDURE update_attribute_index_and_variant_group_visibility();
    `
  );

  // Delete variant group when attribute type is changed from select to something else
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION delete_variant_group_after_attribute_type_changed()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF (OLD.type = 'select' AND NEW.type <> 'select') THEN
          DELETE FROM "variant_group" WHERE ("variant_group".attribute_one = OLD.attribute_id OR "variant_group".attribute_two = OLD.attribute_id OR "variant_group".attribute_three = OLD.attribute_id OR "variant_group".attribute_four = OLD.attribute_id OR "variant_group".attribute_five = OLD.attribute_id);
        END IF;
        RETURN NEW;
      END
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_AFTER_UPDATE_ATTRIBUTE" AFTER UPDATE ON "attribute" FOR EACH ROW
    EXECUTE PROCEDURE delete_variant_group_after_attribute_type_changed();
    `
  );
};
