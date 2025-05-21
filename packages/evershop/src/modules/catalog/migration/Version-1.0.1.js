import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `DROP TRIGGER IF EXISTS "TRIGGER_PRODUCT_AFTER_UPDATE" ON "product";`
  );

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
        UPDATE "variant_group" SET visibility = COALESCE((SELECT bool_or(visibility) FROM "product" WHERE "product"."variant_group_id" = NEW.variant_group_id AND "product"."status" = TRUE GROUP BY "product"."variant_group_id"), FALSE) WHERE "variant_group"."variant_group_id" = NEW.variant_group_id;
        RETURN NEW;
      END;
      $$;
      `
  );

  await execute(
    connection,
    `CREATE CONSTRAINT TRIGGER "TRIGGER_PRODUCT_AFTER_UPDATE" AFTER UPDATE ON "product"
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE PROCEDURE update_attribute_index_and_variant_group_visibility();
    `
  );

  // Drop column uuid from product_attribute_value_index
  await execute(
    connection,
    `ALTER TABLE product_attribute_value_index DROP COLUMN uuid;`
  );
};
