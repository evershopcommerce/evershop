const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  await execute(
    connection,
    'ALTER TABLE "order" ALTER COLUMN "shipment_status" DROP DEFAULT'
  );
  await execute(
    connection,
    'ALTER TABLE "order" ALTER COLUMN "shipment_status" DROP NOT NULL'
  );
  await execute(
    connection,
    'ALTER TABLE "order" ALTER COLUMN "shipment_status" SET DEFAULT NULL'
  );

  await execute(
    connection,
    'ALTER TABLE "order" ALTER COLUMN "payment_status" DROP DEFAULT'
  );
  await execute(
    connection,
    'ALTER TABLE "order" ALTER COLUMN "payment_status" DROP NOT NULL'
  );
  await execute(
    connection,
    'ALTER TABLE "order" ALTER COLUMN "payment_status" SET DEFAULT NULL'
  );

  // Update shipment_status to processing if it is unfullfilled
  await execute(
    connection,
    "UPDATE \"order\" SET shipment_status = 'processing' WHERE shipment_status = 'unfullfilled'"
  );

  // Update shipment_status to shipped if it is fullfilled
  await execute(
    connection,
    "UPDATE \"order\" SET shipment_status = 'shipped' WHERE shipment_status = 'fullfilled'"
  );

  // Rename carrier_name to carrier from shipment table
  await execute(
    connection,
    'ALTER TABLE "shipment" RENAME COLUMN "carrier_name" TO "carrier"'
  );
};
