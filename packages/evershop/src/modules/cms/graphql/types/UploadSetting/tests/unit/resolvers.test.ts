import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let configValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, defaultValue?: unknown) =>
    configValues[path] !== undefined ? configValues[path] : defaultValue
}));

const resolvers = (await import('../../UploadSetting.admin.resolvers.js'))
  .default.Setting as Record<string, (...args: any[]) => unknown>;

const row = (name: string, value: string) => ({ name, value });

describe('UploadSetting admin resolvers', () => {
  beforeEach(() => {
    configValues = {};
  });

  it('returns null when nothing is saved (the form shows the default placeholder)', () => {
    expect(resolvers.uploadMaxFileSize([])).toBeNull();
    expect(resolvers.uploadMaxFileSizePinned([])).toBe(false);
  });

  it('returns the saved setting as a number', () => {
    expect(
      resolvers.uploadMaxFileSize([row('uploadMaxFileSize', '25')])
    ).toBe(25);
  });

  it('nulls out invalid saved values', () => {
    expect(
      resolvers.uploadMaxFileSize([row('uploadMaxFileSize', 'abc')])
    ).toBeNull();
    expect(
      resolvers.uploadMaxFileSize([row('uploadMaxFileSize', '0')])
    ).toBeNull();
  });

  it('reports and returns the config pin', () => {
    configValues['system.upload_max_file_size'] = 5;
    expect(
      resolvers.uploadMaxFileSize([row('uploadMaxFileSize', '25')])
    ).toBe(5);
    expect(resolvers.uploadMaxFileSizePinned([])).toBe(true);
  });

  describe('uploadMaxFileSizePerType', () => {
    it('returns saved rows, dropping invalid entries', () => {
      const saved = JSON.stringify([
        { type: 'video/*', maxSize: '200' },
        { type: '', maxSize: '5' },
        { type: 'image/*', maxSize: '0' }
      ]);
      expect(
        resolvers.uploadMaxFileSizePerType([
          row('uploadMaxFileSizePerType', saved)
        ])
      ).toEqual([{ type: 'video/*', maxSize: 200 }]);
    });

    it('returns [] for absent or malformed values', () => {
      expect(resolvers.uploadMaxFileSizePerType([])).toEqual([]);
      expect(
        resolvers.uploadMaxFileSizePerType([
          row('uploadMaxFileSizePerType', 'not-json')
        ])
      ).toEqual([]);
      expect(resolvers.uploadMaxFileSizePerTypePinned([])).toBe(false);
    });

    it('returns the pinned config map as rows', () => {
      configValues['system.upload_max_file_size_per_type'] = {
        'video/*': 200,
        'image/*': 0
      };
      expect(
        resolvers.uploadMaxFileSizePerType([
          row('uploadMaxFileSizePerType', '[{"type":"audio/*","maxSize":9}]')
        ])
      ).toEqual([{ type: 'video/*', maxSize: 200 }]);
      expect(resolvers.uploadMaxFileSizePerTypePinned([])).toBe(true);
    });
  });

  describe('uploadAllowedMimeTypes', () => {
    it('returns the saved selection filtered against the catalog', () => {
      const saved = JSON.stringify([
        'image/jpeg',
        'image/svg+xml',
        'video/mp4'
      ]);
      expect(
        resolvers.uploadAllowedMimeTypes([row('uploadAllowedMimeTypes', saved)])
      ).toEqual(['image/jpeg', 'video/mp4']);
    });

    it('returns [] when unsaved or malformed', () => {
      expect(resolvers.uploadAllowedMimeTypes([])).toEqual([]);
      expect(
        resolvers.uploadAllowedMimeTypes([
          row('uploadAllowedMimeTypes', 'garbage')
        ])
      ).toEqual([]);
    });

    it('never offers SVG or script-like types in the catalog', () => {
      const options = resolvers.uploadMimeTypeOptions([]) as Array<{
        value: string;
      }>;
      const values = options.map((option) => option.value);
      expect(values).toContain('image/gif');
      expect(values).not.toContain('image/svg+xml');
      expect(values).not.toContain('text/html');
      expect(values.some((value) => value.includes('javascript'))).toBe(false);
    });

    it('exposes config extras read-only', () => {
      configValues['system.upload_allowed_mime_types'] = ['application/x-abc'];
      expect(resolvers.uploadAllowedMimeTypesConfigExtras([])).toEqual([
        'application/x-abc'
      ]);
    });
  });
});
