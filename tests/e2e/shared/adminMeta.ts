import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The throw-away admin user provisioned by globalSetup, persisted to
 * `.auth/admin.meta.json`. Several specs need its id to scope changeset /
 * rollout fixtures to the logged-in admin.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_META_PATH = path.join(__dirname, '..', '.auth', 'admin.meta.json');

export function loadAdminUserId(): number {
  return (
    JSON.parse(readFileSync(ADMIN_META_PATH, 'utf8')) as { adminUserId: number }
  ).adminUserId;
}
