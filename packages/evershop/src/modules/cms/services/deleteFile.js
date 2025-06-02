import { existsSync, lstatSync, unlinkSync } from 'fs';
import { join } from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getValueSync } from '../../../lib/util/registry.js';

/**
 * @param {String} path the file path
 */
export const deleteFile = async (path) => {
  /**
   * @type {Object} uploader
   * @property {Function} upload
   */
  const fileDeleter = getValueSync(
    'fileDeleter',
    localFileDeleter,
    {
      config: getConfig('system.file_storage')
    },
    (value) =>
      // The value must be an object with an delete method
      value && typeof value.delete === 'function'
  );

  const results = await fileDeleter.delete(path);
  return results;
};

const localFileDeleter = {
  delete: async (path) => {
    const mediaPath = CONSTANTS.MEDIAPATH;
    const destination = join(mediaPath, path);
    if (!existsSync(destination)) {
      throw new Error('Requested path does not exist');
    } else if (lstatSync(destination).isDirectory()) {
      throw new Error('Requested path is not a file');
    } else {
      unlinkSync(destination);
    }
  }
};
