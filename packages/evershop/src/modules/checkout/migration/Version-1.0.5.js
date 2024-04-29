const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Add a column 'price_based_cost' to the method table if it does not exist
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_method" ADD COLUMN "price_based_cost" jsonb`
  );

  // Add a column 'price_based_cost' to the method table if it does not exist
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_method" ADD COLUMN "weight_based_cost" jsonb`
  );

  // Delete the constraint 'CONDITION_TYPE_MUST_BE_PRICE_OR_WEIGHT' from the method table
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_method" DROP CONSTRAINT "CONDITION_TYPE_MUST_BE_PRICE_OR_WEIGHT"`
  );

  // Delete the constraint 'CONDITION_TYPE_MUST_BE_PRICE_OR_WEIGHT' from the method table
  await execute(
    connection,
    `ALTER TABLE "shipping_zone_method" DROP CONSTRAINT "CALCULATE API MUST BE PROVIDE IF COST IS NULL"`
  );
};
