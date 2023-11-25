const { join } = require('path');
const { existsSync, readdirSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');

/**
 * @param {String} path the file path
 */
module.exports.browFiles = async (path) => {
  /**
   * @type {Object} uploader
   * @property {Function} list
   */
  const fileBrowser = getValueSync(
    'fileBrowser',
    localFileBrowser,
    {
      config: getConfig('system.file_storage')
    },
    (value) =>
      // The value must be an object with an delete method
      value && typeof value.list === 'function'
  );

  const results = await fileBrowser.list(path);
  return results;
};

const localFileBrowser = {
  list: async (path) => {
    const targetPath = join(CONSTANTS.MEDIAPATH, path);
    if (!existsSync(targetPath)) {
      throw new Error('Requested path does not exist');
    } else {
      return {
        folders: readdirSync(targetPath, {
          withFileTypes: true
        })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name),
        files: readdirSync(targetPath, {
          withFileTypes: true
        })
          .filter((dirent) => dirent.isFile())
          .map((f) => ({
            url: buildUrl('staticAsset', [`${path}/${f.name}`]),
            name: f.name
          }))
      };
    }
  }
};
