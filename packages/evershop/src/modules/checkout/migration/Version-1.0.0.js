const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "cart" (
  "cart_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "sid" varchar DEFAULT NULL,
  "currency" varchar NOT NULL,
  "customer_id" INT DEFAULT NULL,
  "customer_group_id" smallint DEFAULT NULL,
  "customer_email" varchar DEFAULT NULL,
  "customer_full_name" varchar DEFAULT NULL,
  "user_ip" varchar DEFAULT NULL,
  "status" boolean NOT NULL DEFAULT FALSE,
  "coupon" varchar DEFAULT NULL,
  "shipping_fee_excl_tax" decimal(12,4) DEFAULT NULL,
  "shipping_fee_incl_tax" decimal(12,4) DEFAULT NULL,
  "discount_amount" decimal(12,4) DEFAULT NULL,
  "sub_total" decimal(12,4) NOT NULL,
  "sub_total_incl_tax" decimal(12,4) NOT NULL,
  "total_qty" INT NOT NULL,
  "total_weight" decimal(12,4) DEFAULT NULL,
  "tax_amount" decimal(12,4) NOT NULL,
  "grand_total" decimal(12,4) NOT NULL,
  "shipping_method" varchar DEFAULT NULL,
  "shipping_method_name" varchar DEFAULT NULL,
  "shipping_zone_id" INT DEFAULT NULL,
  "shipping_address_id" INT DEFAULT NULL,
  "payment_method" varchar DEFAULT NULL,
  "payment_method_name" varchar DEFAULT NULL,
  "billing_address_id" INT DEFAULT NULL,
  "shipping_note" text DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CART_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  await execute(
    connection,
    `CREATE TABLE "cart_address" (
  "cart_address_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "full_name" varchar DEFAULT NULL,
  "postcode" varchar DEFAULT NULL,
  "telephone" varchar DEFAULT NULL,
  "country" varchar DEFAULT NULL,
  "province" varchar DEFAULT NULL,
  "city" varchar DEFAULT NULL,
  "address_1" varchar DEFAULT NULL,
  "address_2" varchar DEFAULT NULL,
  CONSTRAINT "CART_ADDRESS_UUID_UNIQUE" UNIQUE ("uuid")
)
`
  );

  await execute(
    connection,
    `CREATE TABLE "cart_item" (
  "cart_item_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "cart_id" INT NOT NULL,
  "product_id" INT NOT NULL,
  "product_sku" varchar NOT NULL,
  "product_name" text NOT NULL,
  "thumbnail" varchar DEFAULT NULL,
  "product_weight" decimal(12,4) DEFAULT NULL,
  "product_price" decimal(12,4) NOT NULL,
  "product_price_incl_tax" decimal(12,4) NOT NULL,
  "qty" INT NOT NULL,
  "final_price" decimal(12,4) NOT NULL,
  "final_price_incl_tax" decimal(12,4) NOT NULL,
  "tax_percent" decimal(12,4) NOT NULL,
  "tax_amount" decimal(12,4) NOT NULL,
  "discount_amount" decimal(12,4) NOT NULL,
  "sub_total" decimal(12,4) NOT NULL,
  "total" decimal(12,4) NOT NULL,
  "variant_group_id" INT DEFAULT NULL,
  "variant_options" text DEFAULT NULL,
  "product_custom_options" text DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CART_ITEM_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_CART_ITEM" FOREIGN KEY ("cart_id") REFERENCES "cart" ("cart_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FK_CART_ITEM_PRODUCT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE ON UPDATE NO ACTION
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CART_ITEM" ON "cart_item" ("cart_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_CART_ITEM_PRODUCT" ON "cart_item" ("product_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "order" (
  "order_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "integration_order_id" varchar DEFAULT NULL,
  "sid" varchar DEFAULT NULL,
  "order_number" varchar NOT NULL,
  "cart_id" INT NOT NULL,
  "currency" varchar NOT NULL,
  "customer_id" INT DEFAULT NULL,
  "customer_email" varchar DEFAULT NULL,
  "customer_full_name" varchar DEFAULT NULL,
  "user_ip" varchar DEFAULT NULL,
  "user_agent" varchar DEFAULT NULL,
  "coupon" varchar DEFAULT NULL,
  "shipping_fee_excl_tax" decimal(12,4) DEFAULT NULL,
  "shipping_fee_incl_tax" decimal(12,4) DEFAULT NULL,
  "discount_amount" decimal(12,4) DEFAULT NULL,
  "sub_total" decimal(12,4) NOT NULL,
  "sub_total_incl_tax" decimal(12,4) NOT NULL,
  "total_qty" INT NOT NULL,
  "total_weight" decimal(12,4) DEFAULT NULL,
  "tax_amount" decimal(12,4) NOT NULL,
  "shipping_note" text DEFAULT NULL,
  "grand_total" decimal(12,4) NOT NULL,
  "shipping_method" varchar DEFAULT NULL,
  "shipping_method_name" varchar DEFAULT NULL,
  "shipping_address_id" INT DEFAULT NULL,
  "payment_method" varchar DEFAULT NULL,
  "payment_method_name" varchar DEFAULT NULL,
  "billing_address_id" INT DEFAULT NULL,
  "shipment_status" varchar NOT NULL DEFAULT '0',
  "payment_status" varchar NOT NULL DEFAULT '0',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ORDER_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "ORDER_NUMBER_UNIQUE" UNIQUE ("order_number")
)
`
  );

  await execute(
    connection,
    `CREATE TABLE "order_activity" (
  "order_activity_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "order_activity_order_id" INT NOT NULL,
  "comment" text NOT NULL,
  "customer_notified" boolean NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ORDER_ACTIVITY_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_ORDER_ACTIVITY" FOREIGN KEY ("order_activity_order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ORDER_ACTIVITY" ON "order_activity" ("order_activity_order_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "order_address" (
  "order_address_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "full_name" varchar DEFAULT NULL,
  "postcode" varchar DEFAULT NULL,
  "telephone" varchar DEFAULT NULL,
  "country" varchar DEFAULT NULL,
  "province" varchar DEFAULT NULL,
  "city" varchar DEFAULT NULL,
  "address_1" varchar DEFAULT NULL,
  "address_2" varchar DEFAULT NULL,
  CONSTRAINT "ORDER_ADDRESS_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  await execute(
    connection,
    `CREATE TABLE "order_item" (
  "order_item_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "order_item_order_id" INT NOT NULL,
  "product_id" INT NOT NULL,
  "referer" INT DEFAULT NULL,
  "product_sku" varchar NOT NULL,
  "product_name" text NOT NULL,
  "thumbnail" varchar DEFAULT NULL,
  "product_weight" decimal(12,4) DEFAULT NULL,
  "product_price" decimal(12,4) NOT NULL,
  "product_price_incl_tax" decimal(12,4) NOT NULL,
  "qty" INT NOT NULL,
  "final_price" decimal(12,4) NOT NULL,
  "final_price_incl_tax" decimal(12,4) NOT NULL,
  "tax_percent" decimal(12,4) NOT NULL,
  "tax_amount" decimal(12,4) NOT NULL,
  "discount_amount" decimal(12,4) NOT NULL,
  "sub_total" decimal(12,4) NOT NULL,
  "total" decimal(12,4) NOT NULL,
  "variant_group_id" INT DEFAULT NULL,
  "variant_options" text DEFAULT NULL,
  "product_custom_options" text DEFAULT NULL,
  "requested_data" text DEFAULT NULL,
  CONSTRAINT "ORDER_ITEM_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_ORDER" FOREIGN KEY ("order_item_order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ORDER" ON "order_item" ("order_item_order_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "payment_transaction" (
  "payment_transaction_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "payment_transaction_order_id" INT NOT NULL,
  "transaction_id" varchar DEFAULT NULL,
  "transaction_type" varchar NOT NULL,
  "amount" decimal(12,4) NOT NULL,
  "parent_transaction_id" varchar DEFAULT NULL,
  "payment_action" varchar DEFAULT NULL,
  "additional_information" text DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PAYMENT_TRANSACTION_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "UNQ_PAYMENT_TRANSACTION_ID_ORDER_ID" UNIQUE ("payment_transaction_order_id","transaction_id"),
  CONSTRAINT "FK_PAYMENT_TRANSACTION_ORDER" FOREIGN KEY ("payment_transaction_order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE ON UPDATE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_PAYMENT_TRANSACTION_ORDER" ON "payment_transaction" ("payment_transaction_order_id")`
  );

  await execute(
    connection,
    `CREATE TABLE "shipment" (
  "shipment_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "shipment_order_id" INT NOT NULL,
  "carrier_name" varchar DEFAULT NULL,
  "tracking_number" varchar DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SHIPMENT_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_ORDER_SHIPMENT" FOREIGN KEY ("shipment_order_id") REFERENCES "order" ("order_id") ON DELETE CASCADE
)`
  );
  await execute(
    connection,
    `CREATE INDEX "FK_ORDER_SHIPMENT" ON "shipment" ("shipment_order_id")`
  );

  // Reduce product stock when order is placed if product manage stock is true
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION reduce_product_stock_when_order_placed()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        UPDATE product SET qty = qty - NEW.qty WHERE product_id = NEW.product_id AND manage_stock = TRUE;
        RETURN NEW;
      END
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_AFTER_INSERT_ORDER_ITEM" AFTER INSERT ON "order_item" FOR EACH ROW
    EXECUTE PROCEDURE reduce_product_stock_when_order_placed();
    `
  );
};
