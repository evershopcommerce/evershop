import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Create a function to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION add_order_created_event() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO event (name, data)
      VALUES ('order_created', row_to_json(NEW));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Create a trigger to add event to the event table after a order is created
  await execute(
    connection,
    `CREATE TRIGGER "ADD_ORDER_CREATED_EVENT_TRIGGER"
    AFTER INSERT ON "order"
    FOR EACH ROW
    EXECUTE PROCEDURE add_order_created_event();`
  );
};
