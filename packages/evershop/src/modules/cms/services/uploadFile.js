import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { buildUrl } from '../../../lib/router/buildUrl.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { getValueSync } from '../../../lib/util/registry.js';

/**
 * @param {Array} files an array of files in the format of {name: String, data: Buffer}
 * @param {String} destinationPath the destination path
 */
export const uploadFile = async (files, destinationPath) => {
  /**
   * @type {Object} uploader
   * @property {Function} upload
   */
  const fileUploader = getValueSync(
    'fileUploader',
    localUploader,
    {
      config: getConfig('system.file_storage')
    },
    (value) =>
      // The value must be an object with an upload method
      value && typeof value.upload === 'function'
  );

  const results = await fileUploader.upload(files, destinationPath);
  return results;
};

const localUploader = {
  upload: async (files, destinationPath) => {
    // Assumming the we are using MemoryStorage for multer. Now we need to write the files to disk.
    // The files argument is an array of files from multer.
    const mediaPath = CONSTANTS.MEDIAPATH;
    const destination = path.join(mediaPath, destinationPath);
    // Create the destination folder if it does not exist
    await fs.mkdir(destination, { recursive: true });
    // Save the files to disk asynchrously
    const results = await Promise.all(
      files.map((file) =>
        fs
          .writeFile(path.join(destination, file.filename), file.buffer)
          .then(() => ({
            name: file.filename,
            type: file.minetype,
            size: file.size,
            url: buildUrl('staticAsset', [
              path
                .join(destinationPath, file.filename)
                .split('\\')
                .join('/')
                .replace(/^\//, '')
            ])
          }))
      )
    );
    return results;
  }
};
