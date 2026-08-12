import { getConfig } from '../../../../lib/util/getConfig.js';
import { getEnv } from '../../../../lib/util/getEnv.js';
import { getSetting, getSettingSync } from '../../../setting/services/setting.js';

/**
 * Configuration resolution for the built-in cloud file-storage providers.
 *
 * Provider SELECTION: admin setting (`fileStorage`) wins, config
 * (`system.file_storage`) is the fallback — the storeCurrency pattern.
 *
 * Provider CREDENTIALS/OPTIONS: config file (`system.s3.*` / `system.azure.*`)
 * → environment variable (the names the standalone extensions used) → admin
 * setting → default. Config/env are the infrastructure-pinned overrides; the
 * admin panel manages everything else. When no explicit AWS credentials are
 * configured anywhere, the SDK's default provider chain still applies (shared
 * config, IAM roles, IRSA) — which is why the key fields stay optional.
 */

const firstNonEmpty = (
  ...values: Array<string | undefined | null>
): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return undefined;
};

const parseBoolean = (
  ...values: Array<string | boolean | undefined | null>
): boolean | undefined => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return ['1', 'true', 'yes'].includes(value.trim().toLowerCase());
    }
  }
  return undefined;
};

export function getFileStorageProvider(): string {
  return (
    getSettingSync('fileStorage', '') ||
    getConfig('system.file_storage', 'local')
  );
}

export interface S3StorageConfig {
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** S3-compatible endpoint (Cloudflare R2, MinIO, DigitalOcean Spaces, …) */
  endpoint?: string;
  forcePathStyle: boolean;
  /** Public base URL (CDN) used for stored file URLs instead of the bucket host */
  baseUrl?: string;
}

export async function getS3StorageConfig(): Promise<S3StorageConfig> {
  const bucket = firstNonEmpty(
    getConfig('system.s3.bucket'),
    getEnv('AWS_BUCKET_NAME'),
    await getSetting('s3Bucket', '')
  );
  if (!bucket) {
    throw new Error(
      'S3 file storage is enabled but no bucket is configured. Set the bucket in System Setting, or via `system.s3.bucket` in config, or the AWS_BUCKET_NAME environment variable.'
    );
  }
  return {
    bucket,
    region: firstNonEmpty(
      getConfig('system.s3.region'),
      getEnv('AWS_REGION'),
      await getSetting('s3Region', '')
    ),
    accessKeyId: firstNonEmpty(
      getConfig('system.s3.accessKeyId'),
      getEnv('AWS_ACCESS_KEY_ID'),
      await getSetting('s3AccessKeyId', '')
    ),
    secretAccessKey: firstNonEmpty(
      getConfig('system.s3.secretAccessKey'),
      getEnv('AWS_SECRET_ACCESS_KEY'),
      await getSetting('s3SecretAccessKey', '')
    ),
    endpoint: firstNonEmpty(
      getConfig('system.s3.endpoint'),
      getEnv('AWS_S3_ENDPOINT'),
      await getSetting('s3Endpoint', '')
    ),
    forcePathStyle:
      parseBoolean(
        getConfig('system.s3.forcePathStyle'),
        getEnv('AWS_S3_FORCE_PATH_STYLE'),
        await getSetting('s3ForcePathStyle', '')
      ) ?? false,
    baseUrl: firstNonEmpty(
      getConfig('system.s3.baseUrl'),
      getEnv('AWS_S3_BASE_URL'),
      await getSetting('s3BaseUrl', '')
    )
  };
}

export interface GcsStorageConfig {
  bucket: string;
  /**
   * Full service-account key JSON (the downloaded key file content). Absent =
   * Application Default Credentials — the Google-recommended path on GCP
   * (attached service accounts, GOOGLE_APPLICATION_CREDENTIALS), mirroring the
   * AWS default-chain behavior.
   */
  serviceAccountKey?: string;
  /** Public base URL (CDN) used for stored file URLs instead of storage.googleapis.com */
  baseUrl?: string;
}

export async function getGcsStorageConfig(): Promise<GcsStorageConfig> {
  const bucket = firstNonEmpty(
    getConfig('system.gcs.bucket'),
    getEnv('GCS_BUCKET_NAME'),
    await getSetting('gcsBucket', '')
  );
  if (!bucket) {
    throw new Error(
      'Google Cloud file storage is enabled but no bucket is configured. Set the bucket in System Setting, or via `system.gcs.bucket` in config, or the GCS_BUCKET_NAME environment variable.'
    );
  }
  return {
    bucket,
    serviceAccountKey: firstNonEmpty(
      getConfig('system.gcs.serviceAccountKey'),
      await getSetting('gcsServiceAccountKey', '')
    ),
    baseUrl: firstNonEmpty(
      getConfig('system.gcs.baseUrl'),
      getEnv('GCS_BASE_URL'),
      await getSetting('gcsBaseUrl', '')
    )
  };
}

export interface AzureStorageConfig {
  connectionString: string;
  containerName: string;
  /**
   * Access level applied when the container is auto-created. 'private'
   * (default) never fails account policy; 'blob' requires the storage account
   * to allow anonymous access (`AllowBlobPublicAccess`) or container creation
   * is rejected with PublicAccessNotPermitted.
   */
  containerAccess: 'private' | 'blob';
  /** Public base URL (CDN) used for stored file URLs instead of the blob host */
  baseUrl?: string;
}

export async function getAzureStorageConfig(): Promise<AzureStorageConfig> {
  const connectionString = firstNonEmpty(
    getConfig('system.azure.connectionString'),
    getEnv('AZURE_STORAGE_CONNECTION_STRING'),
    await getSetting('azureStorageConnectionString', '')
  );
  if (!connectionString) {
    throw new Error(
      'Azure file storage is enabled but no connection string is configured. Set it in System Setting, or via `system.azure.connectionString` in config, or the AZURE_STORAGE_CONNECTION_STRING environment variable.'
    );
  }
  return {
    connectionString,
    containerName:
      firstNonEmpty(
        getConfig('system.azure.containerName'),
        getEnv('AZURE_STORAGE_CONTAINER_NAME'),
        await getSetting('azureStorageContainerName', '')
      ) || 'images',
    containerAccess:
      firstNonEmpty(
        getConfig('system.azure.containerAccess'),
        await getSetting('azureContainerAccess', '')
      ) === 'blob'
        ? 'blob'
        : 'private',
    baseUrl: firstNonEmpty(
      getConfig('system.azure.baseUrl'),
      getEnv('AZURE_STORAGE_BASE_URL'),
      await getSetting('azureBaseUrl', '')
    )
  };
}

/**
 * Setting keys whose values are pinned by the config file or an environment
 * variable (infrastructure-managed). Config/env win over the DB setting for
 * credentials, so the System Setting form disables these fields and the
 * GraphQL resolvers return the pinned value (masked, for secrets) instead of
 * the DB row. The provider selection (`fileStorage`) is intentionally absent:
 * there the setting wins and config is only the fallback.
 */
export function getFileStorageConfigOverrides(): Record<string, string> {
  const sources: Record<string, string | boolean | undefined> = {
    s3Region: firstNonEmpty(
      getConfig('system.s3.region'),
      getEnv('AWS_REGION')
    ),
    s3Bucket: firstNonEmpty(
      getConfig('system.s3.bucket'),
      getEnv('AWS_BUCKET_NAME')
    ),
    s3AccessKeyId: firstNonEmpty(
      getConfig('system.s3.accessKeyId'),
      getEnv('AWS_ACCESS_KEY_ID')
    ),
    s3SecretAccessKey: firstNonEmpty(
      getConfig('system.s3.secretAccessKey'),
      getEnv('AWS_SECRET_ACCESS_KEY')
    ),
    s3Endpoint: firstNonEmpty(
      getConfig('system.s3.endpoint'),
      getEnv('AWS_S3_ENDPOINT')
    ),
    s3ForcePathStyle: parseBoolean(
      getConfig('system.s3.forcePathStyle'),
      getEnv('AWS_S3_FORCE_PATH_STYLE')
    ),
    s3BaseUrl: firstNonEmpty(
      getConfig('system.s3.baseUrl'),
      getEnv('AWS_S3_BASE_URL')
    ),
    gcsBucket: firstNonEmpty(
      getConfig('system.gcs.bucket'),
      getEnv('GCS_BUCKET_NAME')
    ),
    gcsServiceAccountKey: firstNonEmpty(
      getConfig('system.gcs.serviceAccountKey')
    ),
    gcsBaseUrl: firstNonEmpty(
      getConfig('system.gcs.baseUrl'),
      getEnv('GCS_BASE_URL')
    ),
    azureStorageConnectionString: firstNonEmpty(
      getConfig('system.azure.connectionString'),
      getEnv('AZURE_STORAGE_CONNECTION_STRING')
    ),
    azureStorageContainerName: firstNonEmpty(
      getConfig('system.azure.containerName'),
      getEnv('AZURE_STORAGE_CONTAINER_NAME')
    ),
    azureContainerAccess: firstNonEmpty(
      getConfig('system.azure.containerAccess')
    ),
    azureBaseUrl: firstNonEmpty(
      getConfig('system.azure.baseUrl'),
      getEnv('AZURE_STORAGE_BASE_URL')
    )
  };
  const overrides: Record<string, string> = {};
  Object.entries(sources).forEach(([key, value]) => {
    if (value !== undefined) {
      overrides[key] = String(value);
    }
  });
  return overrides;
}

/**
 * The AWS region as resolved by the live S3 client. Covers deployments where
 * the region comes from the SDK's deeper provider chain (shared config, IMDS)
 * rather than explicit configuration — cached here after the first client use
 * so the synchronous image-host derivation below can see it.
 */
let resolvedS3Region: string | undefined;

export function setResolvedS3Region(region: string): void {
  resolvedS3Region = region;
}

const hostOf = (urlOrHost: string | undefined): string | undefined => {
  if (!urlOrHost) {
    return undefined;
  }
  try {
    return new URL(urlOrHost).hostname;
  } catch {
    // Not a full URL — accept a bare hostname
    return /^[a-z0-9.-]+$/i.test(urlOrHost) ? urlOrHost : undefined;
  }
};

/**
 * Extract the blob endpoint host from an Azure connection string —
 * `BlobEndpoint=` wins (Azurite, custom domains), otherwise
 * `{AccountName}.blob.{EndpointSuffix}`. Values may contain `=` (base64
 * account keys), so split each pair on the first `=` only.
 */
export function parseAzureBlobHost(
  connectionString: string | undefined
): string | undefined {
  if (!connectionString) {
    return undefined;
  }
  const parts: Record<string, string> = {};
  connectionString.split(';').forEach((pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex > 0) {
      parts[pair.slice(0, separatorIndex).trim()] = pair
        .slice(separatorIndex + 1)
        .trim();
    }
  });
  if (parts.BlobEndpoint) {
    return hostOf(parts.BlobEndpoint);
  }
  if (parts.AccountName) {
    return `${parts.AccountName}.blob.${
      parts.EndpointSuffix || 'core.windows.net'
    }`;
  }
  return undefined;
}

/**
 * Hosts the `/images` proxy must be allowed to fetch from when a cloud storage
 * provider is active — derived from the same configuration the providers use,
 * so operators don't have to mirror it into IMAGE_ALLOWED_HOSTS. Synchronous
 * (the allowlist is checked inside connection callbacks): reads config/env and
 * the warmed settings cache only. Registered with secureFetch in the cms
 * bootstrap.
 */
export function getFileStorageImageHosts(): string[] {
  const provider = getFileStorageProvider();
  const hosts: Array<string | undefined> = [];
  if (provider === 's3') {
    hosts.push(
      hostOf(
        firstNonEmpty(
          getConfig('system.s3.baseUrl'),
          getEnv('AWS_S3_BASE_URL'),
          getSettingSync('s3BaseUrl', '')
        )
      )
    );
    const endpoint = firstNonEmpty(
      getConfig('system.s3.endpoint'),
      getEnv('AWS_S3_ENDPOINT'),
      getSettingSync('s3Endpoint', '')
    );
    const endpointHost = hostOf(endpoint);
    hosts.push(endpointHost);
    const bucket = firstNonEmpty(
      getConfig('system.s3.bucket'),
      getEnv('AWS_BUCKET_NAME'),
      getSettingSync('s3Bucket', '')
    );
    if (endpointHost && bucket) {
      // Virtual-hosted-style URLs on the custom endpoint (the default —
      // Hetzner et al.) are fetched from `{bucket}.{endpointHost}`.
      hosts.push(`${bucket}.${endpointHost}`);
    }
    const region =
      firstNonEmpty(
        getConfig('system.s3.region'),
        getEnv('AWS_REGION'),
        getSettingSync('s3Region', '')
      ) || resolvedS3Region;
    if (bucket && region && !endpoint) {
      hosts.push(`${bucket}.s3.${region}.amazonaws.com`);
    }
  } else if (provider === 'gcs') {
    hosts.push(
      hostOf(
        firstNonEmpty(
          getConfig('system.gcs.baseUrl'),
          getEnv('GCS_BASE_URL'),
          getSettingSync('gcsBaseUrl', '')
        )
      )
    );
    hosts.push('storage.googleapis.com');
  } else if (provider === 'azure') {
    hosts.push(
      hostOf(
        firstNonEmpty(
          getConfig('system.azure.baseUrl'),
          getEnv('AZURE_STORAGE_BASE_URL'),
          getSettingSync('azureBaseUrl', '')
        )
      )
    );
    hosts.push(
      parseAzureBlobHost(
        firstNonEmpty(
          getConfig('system.azure.connectionString'),
          getEnv('AZURE_STORAGE_CONNECTION_STRING'),
          getSettingSync('azureStorageConnectionString', '')
        )
      )
    );
  }
  return hosts.filter((host): host is string => Boolean(host));
}
