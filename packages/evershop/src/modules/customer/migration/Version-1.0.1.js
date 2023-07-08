const { execute } = require('@evershop/postgres-query-builder');

// eslint-disable-next-line no-multi-assign
module.exports = exports = async (connection) => {
  // Create a function to add event to the event table after a customer is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_customer_created_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('customer_created', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a customer is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CUSTOMER_CREATED_EVENT_TRIGGER"
    AFTER INSERT ON customer
    FOR EACH ROW
    EXECUTE PROCEDURE add_customer_created_event();`
  );

  // Create a function to add event to the event table after a customer is updated
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_customer_updated_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('customer_updated', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a customer is updated
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CUSTOMER_UPDATED_EVENT_TRIGGER"
    AFTER UPDATE ON customer
    FOR EACH ROW
    EXECUTE PROCEDURE add_customer_updated_event();`
  );

  // Create a function to add event to the event table after a customer is deleted
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_customer_deleted_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('customer_deleted', row_to_json(OLD));
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a customer is deleted
  await execute(
    connection,
    `CREATE TRIGGER "ADD_CUSTOMER_DELETED_EVENT_TRIGGER"
    AFTER DELETE ON customer
    FOR EACH ROW
    EXECUTE PROCEDURE add_customer_deleted_event();`
  );
};
