import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Add status column for reliable queue processing
  await execute(
    connection,
    `ALTER TABLE "event"
      ADD COLUMN "status" varchar NOT NULL DEFAULT 'pending',
      ADD COLUMN "started_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN "completed_at" TIMESTAMP WITH TIME ZONE`
  );

  // Index for efficient polling: only scan pending rows
  await execute(
    connection,
    `CREATE INDEX "EVENT_STATUS_IDX" ON "event" ("status", "event_id" ASC)`
  );

  // Notify function: fires pg_notify on every new event insert so the
  // event-manager can wake up immediately instead of waiting for the poll cycle
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION notify_new_event() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('new_event', NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`
  );

  await execute(
    connection,
    `CREATE TRIGGER event_inserted
      AFTER INSERT ON "event"
      FOR EACH ROW EXECUTE FUNCTION notify_new_event()`
  );
};
