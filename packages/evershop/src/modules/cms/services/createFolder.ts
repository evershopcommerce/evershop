import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getValueSync } from '../../../lib/util/registry.js';

/**
 * Create a folder at the specified destination path.
 * @param {String} destinationPath the destination path
 */
export const createFolder = async (
  destinationPath: string
): Promise<string> => {
  /**
   * @type {Object} uploader
   * @property {Function} create
   */
  const folderCreator = getValueSync(
    'folderCreator',
    localFolderCreator,
    {
      config: getConfig('system.file_storage')
    },
    (value) =>
      // The value must be an object with an create method
      value && typeof value.create === 'function'
  );

  const results = await folderCreator.create(destinationPath);
  return results;
};

const localFolderCreator = {
  create: async (destinationPath: string): Promise<string> => {
    const mediaPath = CONSTANTS.MEDIAPATH;
    const destination = path.join(mediaPath, destinationPath);
    // Check if the folder already exists
    if (!existsSync(destination)) {
      // Create the destination folder if it does not exist
      await fs.mkdir(destination, { recursive: true });
    }
    return destinationPath;
  }
};
