import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * Inventory events that say what changed, and only when something did.
 *
 * - `inventory_updated` fired on every UPDATE of `product_inventory`, also when
 *   a product was saved with the same stock. The trigger now has a WHEN
 *   clause: no change, no event.
 * - Its payload, `{ old, new }`, named the product only by its id. It now also
 *   carries `product_id`, `product_uuid` and `sku`.
 * - New `product_back_in_stock`: the row goes from out of stock to in stock.
 *   In stock is the storefront's rule (`isInStock` in
 *   `graphql/types/Product/Inventory/Inventory.resolvers.js`): stock not
 *   managed, or a quantity above 0 with stock availability on. Every way the
 *   stock can come back (an admin save, a restock on order cancel, an import,
 *   SQL by hand) goes through this trigger.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_inventory_updated_event() RETURNS TRIGGER AS $$
    DECLARE
      p_uuid UUID;
      p_sku VARCHAR;
    BEGIN
      SELECT p."uuid", p."sku" INTO p_uuid, p_sku
        FROM "product" p
       WHERE p."product_id" = NEW."product_inventory_product_id";
      INSERT INTO event (name, data)
      VALUES ('inventory_updated', json_build_object(
        'product_id', NEW."product_inventory_product_id",
        'product_uuid', p_uuid,
        'sku', p_sku,
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      ));
      IF (NEW."manage_stock" = FALSE
          OR (NEW."qty" > 0 AND NEW."stock_availability" = TRUE))
        AND NOT (OLD."manage_stock" = FALSE
          OR (OLD."qty" > 0 AND OLD."stock_availability" = TRUE)) THEN
        INSERT INTO event (name, data)
        VALUES ('product_back_in_stock', json_build_object(
          'product_id', NEW."product_inventory_product_id",
          'product_uuid', p_uuid,
          'sku', p_sku,
          'qty', NEW."qty",
          'manage_stock', NEW."manage_stock",
          'stock_availability', NEW."stock_availability"
        ));
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Re-created with the WHEN clause. The function above runs only when a
  // column changed, so it never needs to compare the two rows itself.
  await execute(
    connection,
    `DROP TRIGGER IF EXISTS "ADD_INVENTORY_UPDATED_EVENT_TRIGGER" ON "product_inventory"`
  );
  await execute(
    connection,
    `CREATE TRIGGER "ADD_INVENTORY_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON "product_inventory"
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE PROCEDURE add_product_inventory_updated_event();`
  );
};
