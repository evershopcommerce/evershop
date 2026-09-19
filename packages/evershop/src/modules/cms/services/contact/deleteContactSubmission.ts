import { pool } from '../../../../lib/postgres/connection.js';

/**
 * Permanently removes one submission. Single statement, so it needs no explicit
 * transaction — there are no dependent rows to cascade.
 */
export async function deleteContactSubmission(
  uuid: string
): Promise<{ uuid: string }> {
  const result = await pool.query(
    `DELETE FROM contact_submission WHERE uuid = $1`,
    [uuid]
  );
  if (result.rowCount === 0) {
    throw new Error('Contact submission not found');
  }
  return { uuid };
}
