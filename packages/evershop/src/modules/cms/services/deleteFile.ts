import { existsSync, lstatSync, unlinkSync } from 'fs';
import { join } from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { warning } from '../../../lib/log/logger.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { getFileStorageProvider } from './storage/storageConfig.js';

/**
 * Delete a file at the specified path. Idempotent across all providers: a
 * path that does not exist is a successful no-op — the goal state ("file is
 * gone") is already true, so retries and stale file-manager views don't
 * surface errors.
 * @param {String} path the file path
 */
export const deleteFile = async (path: string): Promise<void> => {
  /**
   * @type {Object} uploader
   * @property {Function} upload
   */
  const fileDeleter = getValueSync(
    'fileDeleter',
    localFileDeleter,
    {
      config: getFileStorageProvider()
    },
    (value) =>
      // The value must be an object with an delete method
      value && typeof value.delete === 'function'
  );

  await fileDeleter.delete(path);
};

const localFileDeleter = {
  delete: async (path: string): Promise<void> => {
    const mediaPath = CONSTANTS.MEDIAPATH;
    const destination = join(mediaPath, path);
    if (!existsSync(destination)) {
      warning(
        `deleteFile: "${path}" does not exist — treated as already deleted`
      );
      return;
    }
    if (lstatSync(destination).isDirectory()) {
      throw new Error('Requested path is not a file');
    }
    unlinkSync(destination);
  }
};
