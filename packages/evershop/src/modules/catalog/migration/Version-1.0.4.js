const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Create a function to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_product_inventory_updated_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('inventory_updated', json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_INVENTORY_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON "product_inventory"
    FOR EACH ROW
    EXECUTE PROCEDURE add_product_inventory_updated_event();`
  );
};
