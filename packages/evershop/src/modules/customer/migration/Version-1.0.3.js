const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Update the is_default column to be a boolean, default to false
  await execute(
    connection,
    `ALTER TABLE customer_address
ALTER COLUMN is_default TYPE BOOLEAN USING CASE
    WHEN is_default = 1 THEN TRUE
    WHEN is_default = 0 THEN FALSE
    ELSE NULL -- Handle unexpected values
END;`
  );
};
