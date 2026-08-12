import { BlobServiceClient } from '@azure/storage-blob';
import type { ContainerClient } from '@azure/storage-blob';
import { AzureStorageConfig, getAzureStorageConfig } from '../storageConfig.js';

let cached:
  | {
      cacheKey: string;
      containerClient: ContainerClient;
      ensured: Promise<unknown> | null;
    }
  | undefined;

/**
 * ContainerClient factory reading the live configuration on every call —
 * rebuilt when the connection string / container / access level changes (a
 * settings save applies without restart), reused otherwise. The container is
 * created if missing ONCE per client (memoized promise, reset on failure so
 * the next call retries), not on every operation. Created PRIVATE by default:
 * requesting public access (`containerAccess: 'blob'`) on a storage account
 * that disallows anonymous access is rejected by Azure with
 * PublicAccessNotPermitted — and disallowed is the default account
 * configuration.
 */
export async function getAzureContainerClient(): Promise<{
  containerClient: ContainerClient;
  config: AzureStorageConfig;
}> {
  const config = await getAzureStorageConfig();
  const cacheKey = JSON.stringify([
    config.connectionString,
    config.containerName,
    config.containerAccess
  ]);
  if (!cached || cached.cacheKey !== cacheKey) {
    const serviceClient = BlobServiceClient.fromConnectionString(
      config.connectionString
    );
    cached = {
      cacheKey,
      containerClient: serviceClient.getContainerClient(config.containerName),
      ensured: null
    };
  }
  const entry = cached;
  if (!entry.ensured) {
    entry.ensured = entry.containerClient
      .createIfNotExists(
        config.containerAccess === 'blob' ? { access: 'blob' } : {}
      )
      .catch((e) => {
        entry.ensured = null;
        throw e;
      });
  }
  await entry.ensured;
  return { containerClient: entry.containerClient, config };
}
