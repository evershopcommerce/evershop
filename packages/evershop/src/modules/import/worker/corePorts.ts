import { pool } from '../../../lib/postgres/connection.js';
import { buildUrl } from '../../../lib/router/buildUrl.js';
import { getRoutes } from '../../../lib/router/Router.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { generateFileName } from '../../cms/services/generateFileName.js';
import {
  getAllowedMimeTypes,
  getMaxUploadFileSizeMbForType
} from '../../cms/services/getMulter.js';
import { getFileStorageImageHosts } from '../../cms/services/storage/storageConfig.js';
import { uploadFile } from '../../cms/services/uploadFile.js';
import { getEnabledLanguages } from '../../setting/services/setting.js';
import { createCoreEntityServices } from '../adapters/CoreEntityServices.js';
import { coreLogger } from '../adapters/coreLogger.js';
import {
  backlogLimits,
  fileLimits,
  importFlag,
  importSetting,
  retentionMs
} from '../adapters/importConfig.js';
import type { CorePorts } from './compose.js';

/** The base addresses of the store's own file storage: the local assets, and the cloud hosts. */
function ownStorageBases(): string[] {
  const bases: string[] = [];
  try {
    const home = String(getConfig('shop.homeUrl', '') ?? '');
    // `/assets/<path>` is where the local storage serves its files.
    const asset = buildUrl('staticAsset', ['x']).replace(/x$/, '');
    if (home) bases.push(new URL(asset, home).toString());
  } catch {
    // Routes not loaded, or no home URL: only the cloud hosts count.
  }
  for (const host of getFileStorageImageHosts()) {
    bases.push(`https://${host}/`);
  }
  return bases;
}

/**
 * The real `CorePorts`: core's pool, services, routes, languages, file storage
 * and settings. It reads them when it is called, after `headlessBoot` has run
 * every module's bootstrap and loaded the routes and the settings.
 */
export function createCorePorts(): CorePorts {
  return {
    pool,
    services: createCoreEntityServices(pool),
    // The same test as `assertUrlKeyAvailable`: not admin, not API.
    routePaths: () =>
      getRoutes()
        .filter((route: any) => !route.isAdmin && !route.isApi)
        .map((route: any) => route.path as string),
    enabledLanguages: () => getEnabledLanguages(),
    async storeImage(file) {
      const [stored] = await uploadFile(
        [
          {
            filename: file.fileName,
            buffer: file.buffer,
            mimetype: file.contentType,
            size: file.buffer.length
          } as never
        ],
        file.directory
      );
      return { url: stored.url };
    },
    ownStorage: ownStorageBases,
    allowedImageTypes: () => getAllowedMimeTypes(),
    maxImageBytesForType: (contentType) =>
      Math.round(getMaxUploadFileSizeMbForType(contentType) * 1_048_576),
    sanitizeFileName: generateFileName,
    logger: coreLogger,
    limits: fileLimits(),
    backlog: backlogLimits(),
    imageTimeoutMs: importSetting('imageTimeoutSeconds', 30) * 1000,
    allowPrivateNetworks: () => importFlag('allowPrivateNetworks'),
    retentionMs: retentionMs()
  };
}
