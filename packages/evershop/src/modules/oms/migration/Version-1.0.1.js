const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT NULL;`
  );

  // Prevent changing payment_status if already cancelled (payment_status = 'cancelled')
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_update_payment_status_after_canceling()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.payment_status = 'canceled' AND NEW.payment_status <> 'canceled' THEN
          RAISE EXCEPTION 'Cannot change payment status after cancelling';
        END IF;
        RETURN NEW;
      END;
      $$`
  );

  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_UPDATE_PAYMENT_STATUS_AFTER_CANCEL"
        BEFORE UPDATE ON "order"
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_update_payment_status_after_canceling();`
  );

  // Prevent changing shipment_status if already cancelled (shipment_status = 'cancelled')
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION prevent_update_shipment_status_after_canceling()
        RETURNS TRIGGER
        LANGUAGE PLPGSQL
        AS
      $$
      BEGIN
        IF OLD.shipment_status = 'canceled' AND NEW.shipment_status <> 'canceled' THEN
          RAISE EXCEPTION 'Cannot change shipment status after cancelling';
        END IF;
        RETURN NEW;
      END;
      $$`
  );
  await execute(
    connection,
    `CREATE TRIGGER "PREVENT_UPDATE_SHIPMENT_STATUS_AFTER_CANCEL"
        BEFORE UPDATE ON "order"
        FOR EACH ROW
        EXECUTE PROCEDURE prevent_update_shipment_status_after_canceling();`
  );
};
