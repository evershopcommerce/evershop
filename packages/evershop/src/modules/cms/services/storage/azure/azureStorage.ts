import type { ContainerClient } from '@azure/storage-blob';
import { warning } from '../../../../../lib/log/logger.js';
import type { FileBrowser } from '../../browFiles.js';
import type { UploadedFile } from '../../uploadFile.js';
import { buildKey, encodeKeyForUrl, trimTrailingSlash } from '../buildKey.js';
import { AzureStorageConfig } from '../storageConfig.js';
import {
  FileBrowserProvider,
  FileDeleterProvider,
  FileUploaderProvider,
  FolderCreatorProvider
} from '../types.js';
import { getAzureContainerClient } from './azureClient.js';

/**
 * Public URL for a stored blob. Configured base URL (CDN) wins; otherwise use
 * the SDK's blob client URL — the SDK percent-encodes the blob name, which a
 * hand-concatenated `${containerUrl}/${name}` would not (reserved URL
 * characters in blob names must be escaped).
 */
const buildBlobUrl = (
  containerClient: ContainerClient,
  config: AzureStorageConfig,
  blobName: string
): string =>
  config.baseUrl
    ? `${trimTrailingSlash(config.baseUrl)}/${encodeKeyForUrl(blobName)}`
    : containerClient.getBlobClient(blobName).url;

export const azureFileUploader: FileUploaderProvider = {
  upload: async (
    files: Express.Multer.File[],
    requestedPath: string
  ): Promise<UploadedFile[]> => {
    const { containerClient, config } = await getAzureContainerClient();
    const prefix = buildKey(requestedPath);
    return Promise.all(
      files.map(async (file) => {
        const blobName = prefix ? `${prefix}/${file.filename}` : file.filename;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // Without blobContentType the blob is stored and served as
        // application/octet-stream (the Put Blob default).
        await blockBlobClient.uploadData(file.buffer, {
          blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        return {
          name: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          url: config.baseUrl
            ? buildBlobUrl(containerClient, config, blobName)
            : blockBlobClient.url
        };
      })
    );
  }
};

export const azureFileBrowser: FileBrowserProvider = {
  list: async (
    path: string
  ): Promise<{ files: FileBrowser[]; folders: string[] }> => {
    const { containerClient, config } = await getAzureContainerClient();
    const key = buildKey(path);
    const prefix = key ? `${key}/` : '';
    const folders: string[] = [];
    const files: FileBrowser[] = [];
    // Hierarchical listing returns exactly one level (virtual folders as
    // `prefix` items) — flat listing would iterate every blob under the
    // prefix just to compute the folder names. The iterator pages
    // automatically.
    for await (const item of containerClient.listBlobsByHierarchy('/', {
      prefix
    })) {
      if (item.kind === 'prefix') {
        const name = item.name.slice(prefix.length).replace(/\/$/, '');
        if (name) {
          folders.push(name);
        }
      } else {
        // The zero-byte `{prefix}/` blob is the folder marker, not a file.
        // Filter it by name — not by content length, which would hide genuine
        // empty files.
        if (item.name === prefix) {
          continue;
        }
        files.push({
          name: item.name.slice(prefix.length),
          url: buildBlobUrl(containerClient, config, item.name)
        });
      }
    }
    return { files, folders };
  }
};

export const azureFileDeleter: FileDeleterProvider = {
  delete: async (path: string): Promise<void> => {
    const key = buildKey(path);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { containerClient } = await getAzureContainerClient();
    const response = await containerClient.getBlobClient(key).deleteIfExists();
    if (!response.succeeded) {
      warning(
        `azureFileDeleter: blob "${key}" does not exist — treated as already deleted`
      );
    }
  }
};

export const azureFolderCreator: FolderCreatorProvider = {
  create: async (destinationPath: string): Promise<string> => {
    const key = buildKey(destinationPath);
    if (!key) {
      throw new Error('Requested path is empty');
    }
    const { containerClient } = await getAzureContainerClient();
    // Zero-byte `{key}/` marker blob — the virtual-folder convention; the
    // hierarchical listing groups it into the parent's `prefix` items.
    await containerClient
      .getBlockBlobClient(`${key}/`)
      .uploadData(Buffer.alloc(0));
    return key;
  }
};
