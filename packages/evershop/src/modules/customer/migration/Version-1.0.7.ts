import { execute, type PoolClient } from '@evershop/postgres-query-builder';

/**
 * `customer_created`, `customer_updated` and `customer_deleted` without the
 * password hash. The triggers wrote the whole row (`row_to_json`, 1.0.1), so
 * every subscriber of these events got the hash, a password change sent the
 * new one, and only the webhook module removed it before sending. Now the
 * database leaves `password` out of the payload; the webhook redaction stays
 * as a second guard.
 */
export default async (connection: PoolClient) => {
  for (const [fn, eventName, row] of [
    ['add_customer_created_event', 'customer_created', 'NEW'],
    ['add_customer_updated_event', 'customer_updated', 'NEW'],
    ['add_customer_deleted_event', 'customer_deleted', 'OLD']
  ]) {
    await execute(
      connection,
      `CREATE OR REPLACE FUNCTION ${fn}() RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO event (name, data)
        VALUES ('${eventName}', (to_jsonb(${row}) - 'password')::json);
        RETURN ${row};
      END;
      $$ LANGUAGE plpgsql;`
    );
  }
};
