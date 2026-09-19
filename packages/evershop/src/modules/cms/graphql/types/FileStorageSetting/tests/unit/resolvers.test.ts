import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let configValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, defaultValue?: unknown) =>
    configValues[path] !== undefined ? configValues[path] : defaultValue
}));

let overrides: Record<string, string> = {};
jest.unstable_mockModule(
  '../../../../../services/storage/storageConfig.js',
  () => ({
    getFileStorageConfigOverrides: () => overrides
  })
);

const resolvers = (await import('../../FileStorageSetting.admin.resolvers.js'))
  .default.Setting as Record<string, (...args: any[]) => unknown>;

const row = (name: string, value: string) => ({ name, value });
const admin = { user: { uuid: 'admin' } };
const anonymous = {};

describe('FileStorageSetting admin resolvers', () => {
  beforeEach(() => {
    configValues = {};
    overrides = {};
  });

  describe('fileStorage (provider)', () => {
    it('defaults to local', () => {
      expect(resolvers.fileStorage([])).toBe('local');
    });

    it('falls back to config', () => {
      configValues['system.file_storage'] = 's3';
      expect(resolvers.fileStorage([])).toBe('s3');
    });

    it('lets the saved setting win over config', () => {
      configValues['system.file_storage'] = 's3';
      expect(resolvers.fileStorage([row('fileStorage', 'azure')])).toBe(
        'azure'
      );
    });
  });

  it('returns non-secret settings without a user gate', () => {
    expect(
      resolvers.s3Bucket([row('s3Bucket', 'my-bucket')], {}, anonymous)
    ).toBe('my-bucket');
  });

  it('gates secrets on the authenticated user', () => {
    const setting = [row('s3SecretAccessKey', 'super-secret')];
    expect(resolvers.s3SecretAccessKey(setting, {}, admin)).toBe(
      'super-secret'
    );
    expect(resolvers.s3SecretAccessKey(setting, {}, anonymous)).toBeNull();
  });

  it('returns pinned values for config/env overrides, masked for secrets', () => {
    overrides = {
      s3Bucket: 'pinned-bucket',
      s3SecretAccessKey: 'pinned-secret-value',
      azureStorageConnectionString: 'AccountName=a;AccountKey=k='
    };
    const setting = [
      row('s3Bucket', 'db-bucket'),
      row('s3SecretAccessKey', 'db-secret')
    ];
    expect(resolvers.s3Bucket(setting, {}, admin)).toBe('pinned-bucket');
    const maskedSecret = resolvers.s3SecretAccessKey(
      setting,
      {},
      admin
    ) as string;
    expect(maskedSecret).toMatch(/^pinne\*+$/);
    expect(maskedSecret).not.toContain('pinned-secret-value');
    // Masked even for anonymous callers — the pinned value never leaves as-is
    expect(resolvers.azureStorageConnectionString(setting, {}, anonymous)).toMatch(
      /^Accou\*+$/
    );
  });

  it('parses s3ForcePathStyle into a boolean', () => {
    expect(resolvers.s3ForcePathStyle([], {}, admin)).toBe(false);
    expect(
      resolvers.s3ForcePathStyle([row('s3ForcePathStyle', 'true')], {}, admin)
    ).toBe(true);
    expect(
      resolvers.s3ForcePathStyle([row('s3ForcePathStyle', '1')], {}, admin)
    ).toBe(true);
    expect(
      resolvers.s3ForcePathStyle([row('s3ForcePathStyle', 'false')], {}, admin)
    ).toBe(false);
    overrides = { s3ForcePathStyle: 'true' };
    expect(resolvers.s3ForcePathStyle([], {}, admin)).toBe(true);
  });

  it('applies the container defaults', () => {
    expect(resolvers.azureStorageContainerName([], {}, admin)).toBe('images');
    expect(resolvers.azureContainerAccess([], {}, admin)).toBe('private');
    expect(
      resolvers.azureContainerAccess(
        [row('azureContainerAccess', 'blob')],
        {},
        admin
      )
    ).toBe('blob');
    expect(
      resolvers.azureContainerAccess(
        [row('azureContainerAccess', 'container')],
        {},
        admin
      )
    ).toBe('private');
  });

  it('exposes the pinned setting keys', () => {
    overrides = { s3Bucket: 'x', azureBaseUrl: 'y' };
    expect(resolvers.fileStorageConfigOverrides()).toEqual([
      's3Bucket',
      'azureBaseUrl'
    ]);
  });
});
