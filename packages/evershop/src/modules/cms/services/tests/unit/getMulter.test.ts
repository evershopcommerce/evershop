import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let configValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, defaultValue?: unknown) =>
    configValues[path] !== undefined ? configValues[path] : defaultValue
}));

let settingValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../../setting/services/setting.js', () => ({
  getSettingSync: (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const {
  fileFilter,
  getAllowedMimeTypes,
  getMaxUploadFileSizeMb,
  getMaxUploadFileSizeMbForType,
  getUploadHardCapMb
} = await import('../../getMulter.js');

/** Run the multer fileFilter and return { error, accepted } */
const filter = (
  mimetype: string
): Promise<{ error: Error | null; accepted: boolean | undefined }> =>
  new Promise((resolve) => {
    fileFilter(
      {},
      { mimetype },
      (error: Error | null, accepted?: boolean) =>
        resolve({ error, accepted })
    );
  });

describe('upload fileFilter (shared by /api/files and /api/images)', () => {
  beforeEach(() => {
    configValues = {};
    settingValues = {};
  });

  it('accepts every default image MIME type', async () => {
    const defaults = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/apng'
    ];
    for (const mimetype of defaults) {
      // eslint-disable-next-line no-await-in-loop
      const { error, accepted } = await filter(mimetype);
      expect(error).toBeNull();
      expect(accepted).toBe(true);
    }
  });

  it('rejects types outside the allowlist with the upload error', async () => {
    for (const mimetype of [
      'application/pdf',
      'image/svg+xml',
      'text/html',
      'application/octet-stream',
      'video/mp4'
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { error, accepted } = await filter(mimetype);
      expect(error?.message).toBe(
        'The file you are trying to upload is not allowed'
      );
      expect(accepted).toBeUndefined();
    }
  });

  it('system.upload_allowed_mime_types EXTENDS the defaults instead of replacing them', async () => {
    configValues['system.upload_allowed_mime_types'] = ['application/pdf'];
    // The configured extra type is allowed…
    expect((await filter('application/pdf')).accepted).toBe(true);
    // …and the built-in image types keep working.
    expect((await filter('image/png')).accepted).toBe(true);
    expect((await filter('image/jpeg')).accepted).toBe(true);
  });

  it('deduplicates configured types that repeat a default', () => {
    configValues['system.upload_allowed_mime_types'] = [
      'image/png',
      'application/pdf'
    ];
    const allowed = getAllowedMimeTypes();
    expect(allowed.filter((type: string) => type === 'image/png')).toHaveLength(
      1
    );
    expect(allowed).toContain('application/pdf');
  });

  it('ignores a non-array config value', () => {
    configValues['system.upload_allowed_mime_types'] = 'application/pdf';
    expect(getAllowedMimeTypes()).toHaveLength(6);
  });

  it('lets the admin selection replace the defaults (e.g. disable GIF)', async () => {
    settingValues.uploadAllowedMimeTypes = ['image/jpeg', 'image/png'];
    expect((await filter('image/jpeg')).accepted).toBe(true);
    const { error } = await filter('image/gif');
    expect(error?.message).toBe(
      'The file you are trying to upload is not allowed'
    );
  });

  it('lets the admin enable catalog types beyond images', async () => {
    settingValues.uploadAllowedMimeTypes = ['image/jpeg', 'video/mp4'];
    expect((await filter('video/mp4')).accepted).toBe(true);
  });

  it('ignores non-catalog types injected into the saved selection (SVG stays blocked)', async () => {
    settingValues.uploadAllowedMimeTypes = [
      'image/svg+xml',
      'text/html',
      'image/jpeg'
    ];
    expect(getAllowedMimeTypes()).not.toContain('image/svg+xml');
    expect((await filter('image/svg+xml')).error?.message).toBe(
      'The file you are trying to upload is not allowed'
    );
    expect((await filter('image/jpeg')).accepted).toBe(true);
  });

  it('falls back to the defaults when the saved selection is empty', async () => {
    settingValues.uploadAllowedMimeTypes = [];
    expect((await filter('image/gif')).accepted).toBe(true);
  });

  it('config extras extend on top of the admin selection', async () => {
    settingValues.uploadAllowedMimeTypes = ['image/jpeg'];
    configValues['system.upload_allowed_mime_types'] = ['application/x-custom'];
    expect((await filter('application/x-custom')).accepted).toBe(true);
    expect((await filter('image/jpeg')).accepted).toBe(true);
    expect((await filter('image/png')).accepted).toBeUndefined();
  });
});

describe('getMaxUploadFileSizeMb', () => {
  beforeEach(() => {
    configValues = {};
    settingValues = {};
  });

  it('defaults to 10 MB', () => {
    expect(getMaxUploadFileSizeMb()).toBe(10);
  });

  it('reads the admin setting (saved as a string), fractions allowed', () => {
    settingValues.uploadMaxFileSize = '25';
    expect(getMaxUploadFileSizeMb()).toBe(25);
    settingValues.uploadMaxFileSize = '0.5';
    expect(getMaxUploadFileSizeMb()).toBe(0.5);
  });

  it('lets the config pin win over the admin setting', () => {
    configValues['system.upload_max_file_size'] = 5;
    settingValues.uploadMaxFileSize = '25';
    expect(getMaxUploadFileSizeMb()).toBe(5);
  });

  it('falls back to the default for invalid or non-positive values', () => {
    for (const bad of ['abc', '', '0', '-3']) {
      settingValues.uploadMaxFileSize = bad;
      expect(getMaxUploadFileSizeMb()).toBe(10);
    }
  });
});

describe('getMaxUploadFileSizeMbForType (per-type overrides)', () => {
  beforeEach(() => {
    configValues = {};
    settingValues = {};
  });

  it('uses the master limit when no override matches', () => {
    settingValues.uploadMaxFileSize = '15';
    expect(getMaxUploadFileSizeMbForType('image/png')).toBe(15);
  });

  it('matches a family wildcard from the admin setting rows', () => {
    settingValues.uploadMaxFileSizePerType = [
      { type: 'video/*', maxSize: '200' }
    ];
    expect(getMaxUploadFileSizeMbForType('video/mp4')).toBe(200);
    expect(getMaxUploadFileSizeMbForType('video/webm')).toBe(200);
    expect(getMaxUploadFileSizeMbForType('image/png')).toBe(10);
  });

  it('lets an exact type beat the family wildcard', () => {
    settingValues.uploadMaxFileSizePerType = [
      { type: 'video/*', maxSize: '200' },
      { type: 'video/mp4', maxSize: '300' }
    ];
    expect(getMaxUploadFileSizeMbForType('video/mp4')).toBe(300);
    expect(getMaxUploadFileSizeMbForType('video/webm')).toBe(200);
  });

  it('is case-insensitive on both sides', () => {
    settingValues.uploadMaxFileSizePerType = [
      { type: 'Video/*', maxSize: '200' }
    ];
    expect(getMaxUploadFileSizeMbForType('VIDEO/MP4')).toBe(200);
  });

  it('treats the "no overrides" marker (a JSON string) as empty', () => {
    // Saved when the admin removes every override row
    settingValues.uploadMaxFileSizePerType = '[]';
    expect(getMaxUploadFileSizeMbForType('video/mp4')).toBe(10);
  });

  it('drops invalid rows (bad pattern or non-positive size)', () => {
    settingValues.uploadMaxFileSizePerType = [
      { type: 'not-a-mime', maxSize: '200' },
      { type: 'video/*', maxSize: '0' },
      { type: 'video/*', maxSize: 'abc' }
    ];
    expect(getMaxUploadFileSizeMbForType('video/mp4')).toBe(10);
  });

  it('lets the config map pin win over the admin rows entirely', () => {
    configValues['system.upload_max_file_size_per_type'] = { 'video/*': 50 };
    settingValues.uploadMaxFileSizePerType = [
      { type: 'video/*', maxSize: '200' },
      { type: 'image/*', maxSize: '2' }
    ];
    expect(getMaxUploadFileSizeMbForType('video/mp4')).toBe(50);
    // The pinned map is authoritative — the setting's image rule is ignored
    expect(getMaxUploadFileSizeMbForType('image/png')).toBe(10);
  });

  it('computes the hard cap as the largest configured limit', () => {
    settingValues.uploadMaxFileSize = '15';
    settingValues.uploadMaxFileSizePerType = [
      { type: 'video/*', maxSize: '200' },
      { type: 'image/*', maxSize: '2' }
    ];
    expect(getUploadHardCapMb()).toBe(200);
  });
});
