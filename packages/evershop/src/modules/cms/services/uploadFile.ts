import fs from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../lib/helpers.js';
import { buildUrl } from '../../../lib/router/buildUrl.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { FileBrowser } from './browFiles.js';
import { azureFileUploader } from './storage/azure/azureStorage.js';
import { gcsFileUploader } from './storage/gcs/gcsStorage.js';
import { s3FileUploader } from './storage/s3/s3Storage.js';
import { getFileStorageProvider } from './storage/storageConfig.js';
import type { FileUploaderProvider } from './storage/types.js';

export interface UploadedFile extends FileBrowser {
  mimetype: string;
  size: number;
  url: string;
}

/**
 * The built-in uploader for a provider id, registry-free. The registry's
 * `fileUploader` processors (cms bootstrap) remain authoritative when the
 * app is bootstrapped — they let extensions override providers — but code
 * that runs OUTSIDE a bootstrapped app (the seed CLI) has an empty
 * registry, and the previous default of "always local" silently ignored a
 * configured cloud provider: seeded product images landed on the local
 * filesystem of an S3-configured store.
 */
export const builtinUploaderFor = (provider: string): FileUploaderProvider => {
  switch (provider) {
    case 's3':
      return s3FileUploader;
    case 'azure':
      return azureFileUploader;
    case 'gcs':
      return gcsFileUploader;
    default:
      return localUploader;
  }
};

/**
 * Upload files to the specified destination path.
 * @param {Array} files an array of files in the format of {name: String, data: Buffer}
 * @param {String} destinationPath the destination path
 */
export const uploadFile = async (
  files: Express.Multer.File[],
  destinationPath: string
): Promise<UploadedFile[]> => {
  const provider = getFileStorageProvider();
  /**
   * @type {Object} uploader
   * @property {Function} upload
   */
  const fileUploader = getValueSync(
    'fileUploader',
    builtinUploaderFor(provider),
    {
      config: provider
    },
    (value) =>
      // The value must be an object with an upload method
      value && typeof value.upload === 'function'
  );

  const results = await fileUploader.upload(files, destinationPath);
  return results;
};

const localUploader = {
  upload: async (
    files: Express.Multer.File[],
    destinationPath: string
  ): Promise<UploadedFile[]> => {
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
            mimetype: file.mimetype,
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
