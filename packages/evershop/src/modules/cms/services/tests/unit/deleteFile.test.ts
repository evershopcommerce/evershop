import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mediaPath = mkdtempSync(join(tmpdir(), 'evershop-media-'));

jest.unstable_mockModule('../../../../../lib/helpers.js', () => ({
  CONSTANTS: { MEDIAPATH: mediaPath }
}));

const warning = jest.fn();
jest.unstable_mockModule('../../../../../lib/log/logger.js', () => ({
  warning,
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  success: jest.fn()
}));

jest.unstable_mockModule('../../storage/storageConfig.js', () => ({
  getFileStorageProvider: () => 'local'
}));

const { deleteFile } = await import('../../deleteFile.js');

describe('deleteFile (local provider)', () => {
  beforeEach(() => {
    warning.mockClear();
  });

  it('deletes an existing file', async () => {
    const target = join(mediaPath, 'photo.png');
    writeFileSync(target, 'data');
    await deleteFile('photo.png');
    expect(existsSync(target)).toBe(false);
    expect(warning).not.toHaveBeenCalled();
  });

  it('treats a missing file as already deleted (idempotent) with a warning', async () => {
    await expect(deleteFile('does-not-exist.png')).resolves.toBeUndefined();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('does-not-exist.png')
    );
  });

  it('still refuses to delete a directory', async () => {
    mkdirSync(join(mediaPath, 'a-folder'));
    await expect(deleteFile('a-folder')).rejects.toThrow(
      'Requested path is not a file'
    );
  });
});
