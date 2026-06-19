import type { AdminUserRow } from '../../../types/db/index.js';
import type { CurrentUser } from '../../../types/request.js';

/**
 * Builds a safe CurrentUser payload from a raw AdminUserRow.
 * Uses an explicit allowlist to ensure sensitive fields (e.g. password)
 * are never included in JWT payloads or request locals.
 */
export function buildAdminUserPayload(
  adminUser: AdminUserRow & { roles?: string }
): CurrentUser {
  return {
    admin_user_id: adminUser.admin_user_id,
    uuid: adminUser.uuid,
    email: adminUser.email,
    full_name: adminUser.full_name ?? '',
    status: adminUser.status ? 1 : 0,
    roles: adminUser.roles || '*',
    created_at: adminUser.created_at,
    updated_at: adminUser.updated_at
  };
}
