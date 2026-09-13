import { DateTime } from 'luxon';

export interface BackupIdentity {
  name: string;
  urlKeyBase: string;
  description: string;
  /** The zone actually used (falls back to UTC when the store zone is invalid). */
  zone: string;
}

/**
 * Name, url_key base and description for a homepage backup landing page.
 * Pure: the caller passes the current time and the store timezone. An empty or
 * invalid zone falls back to UTC so the url_key never becomes
 * `homepage-backup-Invalid DateTime`. English source strings, like Duplicate's
 * ` (copy)` — these are stored rows, not UI copy.
 */
export function buildBackupIdentity(
  now: Date,
  timezone: string | null | undefined,
  replacedByName: string
): BackupIdentity {
  const wanted = timezone && timezone.trim() ? timezone.trim() : 'UTC';
  const probe = DateTime.fromJSDate(now).setZone(wanted);
  const zone = probe.isValid ? wanted : 'UTC';
  const dt = DateTime.fromJSDate(now).setZone(zone);
  const stamp = dt.toFormat('yyyy-LL-dd HH:mm');
  return {
    zone,
    name: `Homepage backup ${stamp}`,
    urlKeyBase: `homepage-backup-${dt.toFormat('yyyyLLdd-HHmm')}`,
    description: `Backup of the homepage widgets taken on ${stamp}, before the homepage was replaced by "${replacedByName}".`
  };
}

/** The url_key prefix that identifies a backup made by "Replace homepage". */
export const HOMEPAGE_BACKUP_URL_KEY_PREFIX = 'homepage-backup-';
