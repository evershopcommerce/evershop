import { describe, it, expect } from '@jest/globals';
import {
  buildBackupIdentity,
  HOMEPAGE_BACKUP_URL_KEY_PREFIX
} from '../../services/landingPage/backupIdentity.js';

const URL_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const now = new Date('2026-09-12T07:03:00Z');

describe('buildBackupIdentity', () => {
  it('formats name and url_key in the store timezone', () => {
    const id = buildBackupIdentity(now, 'Asia/Saigon', 'Black Friday');
    expect(id.zone).toBe('Asia/Saigon');
    expect(id.name).toBe('Homepage backup 2026-09-12 14:03');
    expect(id.urlKeyBase).toBe('homepage-backup-20260912-1403');
    expect(id.urlKeyBase.startsWith(HOMEPAGE_BACKUP_URL_KEY_PREFIX)).toBe(true);
    expect(URL_KEY_PATTERN.test(id.urlKeyBase)).toBe(true);
    expect(id.description).toContain('"Black Friday"');
    expect(id.description).toContain('2026-09-12 14:03');
  });

  it('falls back to UTC for an empty or invalid timezone and never yields "Invalid DateTime"', () => {
    for (const tz of ['', '   ', 'Not/AZone', null, undefined]) {
      const id = buildBackupIdentity(now, tz as any, 'X');
      expect(id.zone).toBe('UTC');
      expect(id.name).toBe('Homepage backup 2026-09-12 07:03');
      expect(id.urlKeyBase).toBe('homepage-backup-20260912-0703');
      expect(URL_KEY_PATTERN.test(id.urlKeyBase)).toBe(true);
    }
  });
});
