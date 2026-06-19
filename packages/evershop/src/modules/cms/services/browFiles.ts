import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { buildUrl } from '../../../lib/router/buildUrl.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getValueSync } from '../../../lib/util/registry.js';

export interface FileBrowser {
  name: string;
  url: string;
}

/**
 * @param {String} path the file path
 */
export const browFiles = async (
  path: string
): Promise<{ files: FileBrowser[]; folders: string[] }> => {
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
  list: async (
    path: string
  ): Promise<{ files: FileBrowser[]; folders: string[] }> => {
    const targetPath = join(CONSTANTS.MEDIAPATH, path);
    if (!existsSync(targetPath)) {
      throw new Error('Requested path does not exist');
    } else {
      // Strip leading/trailing slashes from the input path so the joined
      // relative path doesn't start with `/`. `buildUrl('staticAsset', ['x'])`
      // appends to `/assets/`, so an input like `/x` produced `/assets//x`
      // (double slash) and broke the storefront `imageProcessor` lookup.
      const cleanPath = path.replace(/^\/+|\/+$/g, '');
      const relative = (name: string) =>
        cleanPath ? `${cleanPath}/${name}` : name;
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
            url: buildUrl('staticAsset', [relative(f.name)]),
            name: f.name
          }))
      };
    }
  }
};
