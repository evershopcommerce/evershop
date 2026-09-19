import { update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';

export type ContactSubmissionStatus = 'unread' | 'read' | 'spam';

/**
 * Admin-side status change (mark read / unread / spam). The allowed values are
 * also enforced by the route's `payloadSchema.json` enum; this guard is here so
 * the service is safe when called directly.
 */
export async function updateContactSubmissionStatus(
  uuid: string,
  status: ContactSubmissionStatus
): Promise<{ uuid: string; status: ContactSubmissionStatus }> {
  const allowed: ContactSubmissionStatus[] = ['unread', 'read', 'spam'];
  if (!allowed.includes(status)) {
    throw new Error(`Invalid contact submission status: ${status}`);
  }

  const result = await update('contact_submission')
    .given({ status })
    .where('uuid', '=', uuid)
    .execute(pool);

  if (!result) {
    throw new Error('Contact submission not found');
  }
  return { uuid, status };
}
