import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let configValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, defaultValue?: unknown) =>
    configValues[path] !== undefined ? configValues[path] : defaultValue
}));

let envValues: Record<string, string> = {};
jest.unstable_mockModule('../../../../../../lib/util/getEnv.js', () => ({
  getEnv: (name: string, defaultValue?: string) =>
    envValues[name] !== undefined ? envValues[name] : defaultValue
}));

let settingValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../../../setting/services/setting.js', () => ({
  getSetting: async (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const {
  getFileStorageProvider,
  getS3StorageConfig,
  getAzureStorageConfig,
  getGcsStorageConfig,
  getFileStorageConfigOverrides,
  getFileStorageImageHosts,
  parseAzureBlobHost,
  setResolvedS3Region
} = await import('../../storageConfig.js');

describe('storageConfig', () => {
  beforeEach(() => {
    configValues = {};
    envValues = {};
    settingValues = {};
  });

  describe('provider selection', () => {
    it('defaults to local', () => {
      expect(getFileStorageProvider()).toBe('local');
    });

    it('falls back to config when no setting is saved', () => {
      configValues['system.file_storage'] = 's3';
      expect(getFileStorageProvider()).toBe('s3');
    });

    it('lets the admin setting win over config', () => {
      configValues['system.file_storage'] = 's3';
      settingValues.fileStorage = 'azure';
      expect(getFileStorageProvider()).toBe('azure');
    });

    it('ignores an empty saved setting', () => {
      configValues['system.file_storage'] = 's3';
      settingValues.fileStorage = '';
      expect(getFileStorageProvider()).toBe('s3');
    });
  });

  describe('getS3StorageConfig', () => {
    it('throws a clear error when no bucket is configured anywhere', async () => {
      await expect(getS3StorageConfig()).rejects.toThrow(
        'no bucket is configured'
      );
    });

    it('resolves each key with config over env over setting', async () => {
      configValues['system.s3.bucket'] = 'config-bucket';
      envValues.AWS_BUCKET_NAME = 'env-bucket';
      settingValues.s3Bucket = 'setting-bucket';
      envValues.AWS_REGION = 'us-east-2';
      settingValues.s3Region = 'ap-south-1';
      settingValues.s3AccessKeyId = 'AKIA-SETTING';
      settingValues.s3SecretAccessKey = 'secret-setting';
      settingValues.s3ForcePathStyle = 'true';
      const config = await getS3StorageConfig();
      expect(config).toEqual({
        bucket: 'config-bucket',
        region: 'us-east-2',
        accessKeyId: 'AKIA-SETTING',
        secretAccessKey: 'secret-setting',
        endpoint: undefined,
        forcePathStyle: true,
        baseUrl: undefined
      });
    });

    it('leaves credentials undefined for the SDK default chain', async () => {
      envValues.AWS_BUCKET_NAME = 'env-bucket';
      const config = await getS3StorageConfig();
      expect(config.accessKeyId).toBeUndefined();
      expect(config.secretAccessKey).toBeUndefined();
      expect(config.forcePathStyle).toBe(false);
    });

    it('reads AWS keys from env before settings', async () => {
      envValues.AWS_BUCKET_NAME = 'env-bucket';
      envValues.AWS_ACCESS_KEY_ID = 'AKIA-ENV';
      envValues.AWS_SECRET_ACCESS_KEY = 'env-secret';
      settingValues.s3AccessKeyId = 'AKIA-SETTING';
      settingValues.s3SecretAccessKey = 'setting-secret';
      const config = await getS3StorageConfig();
      expect(config.accessKeyId).toBe('AKIA-ENV');
      expect(config.secretAccessKey).toBe('env-secret');
    });
  });

  describe('getAzureStorageConfig', () => {
    it('throws a clear error when no connection string is configured', async () => {
      await expect(getAzureStorageConfig()).rejects.toThrow(
        'no connection string is configured'
      );
    });

    it('defaults the container to "images" and access to private', async () => {
      envValues.AZURE_STORAGE_CONNECTION_STRING = 'AccountName=acct;AccountKey=k=';
      const config = await getAzureStorageConfig();
      expect(config.containerName).toBe('images');
      expect(config.containerAccess).toBe('private');
    });

    it('accepts only "blob" as a public access level', async () => {
      envValues.AZURE_STORAGE_CONNECTION_STRING = 'AccountName=acct;AccountKey=k=';
      settingValues.azureContainerAccess = 'container';
      expect((await getAzureStorageConfig()).containerAccess).toBe('private');
      settingValues.azureContainerAccess = 'blob';
      expect((await getAzureStorageConfig()).containerAccess).toBe('blob');
    });
  });

  describe('getGcsStorageConfig', () => {
    it('throws a clear error when no bucket is configured', async () => {
      await expect(getGcsStorageConfig()).rejects.toThrow(
        'no bucket is configured'
      );
    });

    it('resolves the bucket with config over env over setting', async () => {
      envValues.GCS_BUCKET_NAME = 'env-bucket';
      settingValues.gcsBucket = 'setting-bucket';
      expect((await getGcsStorageConfig()).bucket).toBe('env-bucket');
      configValues['system.gcs.bucket'] = 'config-bucket';
      expect((await getGcsStorageConfig()).bucket).toBe('config-bucket');
    });

    it('leaves the service account key undefined for ADC', async () => {
      settingValues.gcsBucket = 'shop';
      const config = await getGcsStorageConfig();
      expect(config.serviceAccountKey).toBeUndefined();
    });
  });

  describe('getFileStorageConfigOverrides', () => {
    it('is empty when nothing is pinned by config or env', () => {
      settingValues.s3Bucket = 'from-settings-only';
      expect(getFileStorageConfigOverrides()).toEqual({});
    });

    it('marks env-provided AWS keys as pinned so the admin form disables them', () => {
      envValues.AWS_ACCESS_KEY_ID = 'AKIA-ENV';
      envValues.AWS_SECRET_ACCESS_KEY = 'env-secret';
      expect(getFileStorageConfigOverrides()).toEqual({
        s3AccessKeyId: 'AKIA-ENV',
        s3SecretAccessKey: 'env-secret'
      });
    });

    it('lists config/env-pinned keys with stringified values', () => {
      configValues['system.s3.secretAccessKey'] = 'config-secret';
      configValues['system.s3.forcePathStyle'] = false;
      envValues.AWS_BUCKET_NAME = 'env-bucket';
      envValues.AZURE_STORAGE_CONNECTION_STRING = 'AccountName=a;AccountKey=k=';
      expect(getFileStorageConfigOverrides()).toEqual({
        s3Bucket: 'env-bucket',
        s3SecretAccessKey: 'config-secret',
        s3ForcePathStyle: 'false',
        azureStorageConnectionString: 'AccountName=a;AccountKey=k='
      });
    });
  });

  describe('parseAzureBlobHost', () => {
    it('builds the host from AccountName and EndpointSuffix', () => {
      expect(
        parseAzureBlobHost(
          'DefaultEndpointsProtocol=https;AccountName=myshop;AccountKey=abc==;EndpointSuffix=core.windows.net'
        )
      ).toBe('myshop.blob.core.windows.net');
    });

    it('defaults the endpoint suffix', () => {
      expect(parseAzureBlobHost('AccountName=myshop;AccountKey=abc==')).toBe(
        'myshop.blob.core.windows.net'
      );
    });

    it('prefers an explicit BlobEndpoint (Azurite, custom domains)', () => {
      expect(
        parseAzureBlobHost(
          'BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;AccountName=devstoreaccount1'
        )
      ).toBe('127.0.0.1');
    });

    it('returns undefined for garbage', () => {
      expect(parseAzureBlobHost(undefined)).toBeUndefined();
      expect(parseAzureBlobHost('not a connection string')).toBeUndefined();
    });
  });

  describe('getFileStorageImageHosts', () => {
    it('returns nothing for local storage', () => {
      expect(getFileStorageImageHosts()).toEqual([]);
    });

    it('derives the S3 bucket host from configured region and bucket', () => {
      settingValues.fileStorage = 's3';
      settingValues.s3Bucket = 'my-bucket';
      settingValues.s3Region = 'eu-west-1';
      expect(getFileStorageImageHosts()).toEqual([
        'my-bucket.s3.eu-west-1.amazonaws.com'
      ]);
    });

    it('uses the client-resolved region when none is configured', () => {
      settingValues.fileStorage = 's3';
      settingValues.s3Bucket = 'my-bucket';
      setResolvedS3Region('ap-southeast-2');
      expect(getFileStorageImageHosts()).toEqual([
        'my-bucket.s3.ap-southeast-2.amazonaws.com'
      ]);
    });

    it('uses the endpoint hosts instead of the AWS host for S3-compatible services', () => {
      settingValues.fileStorage = 's3';
      settingValues.s3Bucket = 'shop';
      settingValues.s3Region = 'auto';
      settingValues.s3Endpoint = 'https://fsn1.your-objectstorage.com';
      // Both addressing styles: path-style fetches hit the endpoint host,
      // virtual-hosted fetches hit {bucket}.{endpointHost}.
      expect(getFileStorageImageHosts()).toEqual([
        'fsn1.your-objectstorage.com',
        'shop.fsn1.your-objectstorage.com'
      ]);
    });

    it('includes the CDN base URL host', () => {
      settingValues.fileStorage = 's3';
      settingValues.s3Bucket = 'my-bucket';
      settingValues.s3Region = 'eu-west-1';
      settingValues.s3BaseUrl = 'https://cdn.example.com/media';
      expect(getFileStorageImageHosts()).toEqual([
        'cdn.example.com',
        'my-bucket.s3.eu-west-1.amazonaws.com'
      ]);
    });

    it('allows storage.googleapis.com for GCS, plus the CDN host', () => {
      settingValues.fileStorage = 'gcs';
      expect(getFileStorageImageHosts()).toEqual(['storage.googleapis.com']);
      settingValues.gcsBaseUrl = 'https://cdn.example.com';
      expect(getFileStorageImageHosts()).toEqual([
        'cdn.example.com',
        'storage.googleapis.com'
      ]);
    });

    it('derives the Azure blob host from the connection string', () => {
      settingValues.fileStorage = 'azure';
      settingValues.azureStorageConnectionString =
        'DefaultEndpointsProtocol=https;AccountName=myshop;AccountKey=abc==;EndpointSuffix=core.windows.net';
      expect(getFileStorageImageHosts()).toEqual([
        'myshop.blob.core.windows.net'
      ]);
    });
  });
});
