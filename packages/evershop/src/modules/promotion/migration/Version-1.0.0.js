const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "coupon" (
  "coupon_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid (),
  "status" boolean NOT NULL DEFAULT TRUE,
  "description" varchar NOT NULL,
  "discount_amount" decimal(12,4) NOT NULL,
  "free_shipping" boolean NOT NULL DEFAULT FALSE,
  "discount_type" varchar NOT NULL DEFAULT '1',
  "coupon" varchar NOT NULL,
  "used_time" INT NOT NULL DEFAULT 0,
  "target_products" text DEFAULT NULL,
  "condition" text NULL DEFAULT NULL,
  "user_condition" text DEFAULT NULL,
  "buyx_gety" text DEFAULT NULL,
  "max_uses_time_per_coupon" INT DEFAULT NULL,
  "max_uses_time_per_customer" INT DEFAULT NULL,
  "start_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "end_date" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "POSITIVE_DISCOUNT_AMOUNT" CHECK(discount_amount >= 0),
  CONSTRAINT "VALID_PERCENTAGE_DISCOUNT" CHECK(discount_amount <= 100 OR discount_type != 'percentage'),
  CONSTRAINT "COUPON_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "COUPON_UNIQUE" UNIQUE ("coupon")
)`
  );

  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION set_coupon_used_time()
        RETURNS TRIGGER 
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        UPDATE "coupon" SET used_time = used_time + 1 WHERE coupon = NEW.coupon;
        RETURN NEW;
      END;
      $$;`
  );
  await execute(
    connection,
    `CREATE TRIGGER "TRIGGER_UPDATE_COUPON_USED_TIME_AFTER_CREATE_ORDER" AFTER INSERT ON "order"
     FOR EACH ROW 
     EXECUTE PROCEDURE set_coupon_used_time();
    `
  );
};
