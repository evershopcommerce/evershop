-- Manual fixture-driven verification for Version-1.0.3.ts backfill.
--
-- Runs in a transaction that ROLLBACKs at the end, so it's safe to re-run
-- against any environment where the migration has already been applied.
-- The asserts are visual (SELECT output) — eyeball the result vs. the expectations
-- in the comments.
--
-- Usage:
--   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f Version-1.0.3.test.sql
--
-- Three orders seeded, covering the three backfill branches:
--   90001 — physical-only, shipment status 'delivered'
--   90002 — mixed physical+digital, shipment status 'shipped'
--   90003 — all-digital (legacy vestigial shipment from createShipmentForVirtualProductsOrder hook)
--
-- Expected results:
--   * Shipment statuses + timestamps mirror order.shipment_status.
--   * shipment_item rows are created ONLY for physical items.
--   * The all-digital order's vestigial shipment has zero shipment_item rows.

BEGIN;

INSERT INTO "order" (uuid, order_number, sid, customer_email, currency, shipping_method_data, cart_id,
  sub_total, sub_total_incl_tax, sub_total_with_discount, sub_total_with_discount_incl_tax,
  shipping_fee_excl_tax, shipping_fee_incl_tax, total_qty, total_weight,
  tax_amount, tax_amount_before_discount, shipping_tax_amount,
  grand_total, status, shipment_status, payment_status, no_shipping_required)
VALUES
  (gen_random_uuid(), '90001', 'sid1', 'a@x.com', 'USD', '{}'::jsonb, 1, 100,100,100,100,0,0,2,0,0,0,0,100,'processing','delivered','paid',false),
  (gen_random_uuid(), '90002', 'sid2', 'b@x.com', 'USD', '{}'::jsonb, 1, 50,50,50,50,0,0,2,0,0,0,0,50,'processing','shipped','paid',false),
  (gen_random_uuid(), '90003', 'sid3', 'c@x.com', 'USD', '{}'::jsonb, 1, 20,20,20,20,0,0,1,0,0,0,0,20,'completed','delivered','paid',true);

INSERT INTO order_item (order_item_order_id, product_id, product_sku, product_name,
  product_price, product_price_incl_tax, qty, final_price, final_price_incl_tax,
  tax_percent, tax_amount, tax_amount_before_discount, discount_amount,
  line_total, line_total_with_discount, line_total_incl_tax, line_total_with_discount_incl_tax,
  no_shipping_required)
SELECT o.order_id, v.prod, v.sku, v.name, v.price, v.price, v.qty, v.price, v.price, 0,0,0,0, v.total, v.total, v.total, v.total, v.dig
FROM (VALUES
  ('90001'::varchar, 1, 'SKU-T1'::varchar, 'Tshirt'::text, 50.0, 2, 100.0, FALSE),
  ('90002'::varchar, 2, 'SKU-M1'::varchar, 'Mug'::text,    30.0, 1,  30.0, FALSE),
  ('90002'::varchar, 3, 'SKU-E1'::varchar, 'eBook'::text,  20.0, 1,  20.0, TRUE),
  ('90003'::varchar, 4, 'SKU-D1'::varchar, 'Digital'::text,20.0, 1,  20.0, TRUE)
) AS v(num, prod, sku, name, price, qty, total, dig)
JOIN "order" o ON o.order_number = v.num;

INSERT INTO shipment (shipment_order_id, carrier, tracking_number)
SELECT o.order_id, v.carrier, v.trk FROM (VALUES
  ('90001'::varchar, 'fedex'::varchar, 'TRK1'::varchar),
  ('90002'::varchar, 'usps'::varchar,  'TRK2'::varchar),
  ('90003'::varchar, NULL::varchar,    NULL::varchar)
) AS v(num, carrier, trk) JOIN "order" o ON o.order_number = v.num;

-- Replay the migration's backfill statements (idempotent against an already-migrated schema):
UPDATE "shipment" s
   SET "status"       = COALESCE(o."shipment_status", 'pending'),
       "shipped_at"   = CASE WHEN o."shipment_status" IN ('shipped','delivered') THEN s."created_at" ELSE NULL END,
       "delivered_at" = CASE WHEN o."shipment_status" = 'delivered' THEN s."updated_at" ELSE NULL END,
       "canceled_at"  = CASE WHEN o."shipment_status" = 'canceled' THEN s."updated_at" ELSE NULL END
  FROM "order" o
 WHERE s."shipment_order_id" = o."order_id" AND o.order_number IN ('90001','90002','90003');

INSERT INTO "shipment_item" ("shipment_id", "order_item_id", "qty")
  SELECT s."shipment_id", oi."order_item_id", oi."qty"
  FROM "shipment" s
  JOIN "order" o ON s."shipment_order_id" = o.order_id
  JOIN "order_item" oi ON oi."order_item_order_id" = s."shipment_order_id"
  WHERE oi."no_shipping_required" = FALSE
    AND o.order_number IN ('90001','90002','90003')
  ON CONFLICT ("shipment_id", "order_item_id") DO NOTHING;

\echo
\echo === Shipment timestamps & status ===
\echo Expected:
\echo   90001 delivered  shipped_at=t  delivered_at=t  canceled_at=f
\echo   90002 shipped    shipped_at=t  delivered_at=f  canceled_at=f
\echo   90003 delivered  shipped_at=t  delivered_at=t  canceled_at=f
SELECT o.order_number, s.status,
       (s.shipped_at IS NOT NULL)   AS shipped_at_set,
       (s.delivered_at IS NOT NULL) AS delivered_at_set,
       (s.canceled_at IS NOT NULL)  AS canceled_at_set
  FROM "order" o JOIN shipment s ON s.shipment_order_id = o.order_id
 WHERE o.order_number IN ('90001','90002','90003') ORDER BY o.order_number;

\echo
\echo === Shipment items per order (digital items MUST NOT appear) ===
\echo Expected:
\echo   90001 SKU-T1  is_digital=f  in_shipment_qty=2
\echo   90002 SKU-E1  is_digital=t  in_shipment_qty=NULL  (digital, skipped)
\echo   90002 SKU-M1  is_digital=f  in_shipment_qty=1
\echo   90003 SKU-D1  is_digital=t  in_shipment_qty=NULL  (digital, skipped — all-digital order has 0 shipment_items)
SELECT o.order_number, oi.product_sku, oi.no_shipping_required AS is_digital, si.qty AS in_shipment_qty
  FROM "order" o
  JOIN order_item oi ON oi.order_item_order_id = o.order_id
  LEFT JOIN shipment_item si ON si.order_item_id = oi.order_item_id
 WHERE o.order_number IN ('90001','90002','90003')
 ORDER BY o.order_number, oi.product_sku;

ROLLBACK;
