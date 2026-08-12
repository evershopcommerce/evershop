import { getDb } from './db.js';

/**
 * Read a raw `setting` value straight from the DB (the table stores every scalar as TEXT).
 * Returns `null` when the row is absent. Used by the settings specs to assert that a save
 * through the admin form actually persisted.
 */
export async function getSettingValue(name: string): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT value FROM setting WHERE name = $1',
    [name]
  );
  return rows.length > 0 ? (rows[0].value as string) : null;
}

/**
 * Snapshot the current values of several setting keys so a spec can restore them afterwards.
 * Restore must go through `POST /api/settings` (NOT a raw DB write) so the server's in-memory
 * settings cache is refreshed — see `fileStorage/cloudProviders.spec.ts`.
 */
export async function snapshotSettings(
  names: string[]
): Promise<Record<string, string | null>> {
  const snapshot: Record<string, string | null> = {};
  for (const name of names) {
    snapshot[name] = await getSettingValue(name);
  }
  return snapshot;
}
