const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');

/**
 * @param {String} destinationPath the destination path
 */
module.exports.createFolder = async (destinationPath) => {
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
  create: async (destinationPath) => {
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
