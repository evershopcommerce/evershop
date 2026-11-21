import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Historical orders (G2 of the import engine, `oms/services/importOrder.ts`).
 *
 * An order that already happened must not take stock again, and must not announce
 * itself as a new order: two triggers fire when an order is written, and both
 * now step aside when the transaction says it is importing
 * (`set_config('evershop.importing', 'on', true)`, which lasts for that
 * transaction only).
 *
 * - `reduce_product_stock_when_order_placed` (on `order_item`) takes the quantity
 *   off `product_inventory`: a historical order's stock was taken when it was placed.
 * - `add_order_created_event` (on `order`) writes the event `order_created`, which
 *   starts webhooks, e-mail and analytics: nobody should hear of a year-old order.
 *
 * The third trigger, `set_coupon_used_time`, is left alone: the use of a coupon in
 * an old order is real use (D-29). Without the setting nothing changes: this only
 * adds the early return, and the rest of each function is as it was in
 * Version-1.0.2 and Version-1.0.3. `current_setting(..., true)` is NULL when the
 * setting was never made, and NULL is not 'on'.
 *
 * No privileges and no lock are needed (not `ALTER TABLE ... DISABLE TRIGGER`, not
 * `session_replication_role`).
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION reduce_product_stock_when_order_placed()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF current_setting('evershop.importing', true) = 'on' THEN
          RETURN NEW;
        END IF;
        UPDATE product_inventory SET qty = qty - NEW.qty WHERE product_inventory_product_id = NEW.product_id AND manage_stock = TRUE;
        RETURN NEW;
      END
      $$;`
  );

  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_order_created_event() RETURNS TRIGGER AS $$
    BEGIN
      IF current_setting('evershop.importing', true) = 'on' THEN
        RETURN NEW;
      END IF;
      INSERT INTO event (name, data)
      VALUES ('order_created', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );
};
