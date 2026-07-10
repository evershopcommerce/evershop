import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/* Fake AWS SDK: capture client config, script HeadBucket outcomes. */
const s3Constructed: any[] = [];
let headBucketError: any = null;
class S3Client {
  constructor(options: any) {
    s3Constructed.push(options);
  }

  async send() {
    if (headBucketError) {
      throw headBucketError;
    }
    return {};
  }

  destroy() {}
}
class HeadBucketCommand {
  constructor(public input: any) {}
}
jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client,
  HeadBucketCommand
}));

/* Fake Azure SDK: script fromConnectionString + getProperties outcomes. */
let azureParseError: Error | null = null;
let azureGetPropertiesError: any = null;
const azureCalls: any[] = [];
jest.unstable_mockModule('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: (connectionString: string, options: any) => {
      azureCalls.push({ connectionString, options });
      if (azureParseError) {
        throw azureParseError;
      }
      return {
        getProperties: async () => {
          if (azureGetPropertiesError) {
            throw azureGetPropertiesError;
          }
          return {};
        }
      };
    }
  }
}));

/* Fake GCS SDK: capture constructor options, script the listing probe. */
const gcsConstructed: any[] = [];
let gcsGetFilesError: any = null;
const gcsGetFilesCalls: any[] = [];
class Storage {
  constructor(options?: any) {
    gcsConstructed.push(options);
  }

  bucket(name: string) {
    return {
      getFiles: async (options: any) => {
        gcsGetFilesCalls.push({ name, options });
        if (gcsGetFilesError) {
          throw gcsGetFilesError;
        }
        return [[], null, {}];
      }
    };
  }
}
jest.unstable_mockModule('@google-cloud/storage', () => ({ Storage }));

let overrides: Record<string, string> = {};
jest.unstable_mockModule('../../storageConfig.js', () => ({
  getFileStorageConfigOverrides: () => overrides,
  getGcsStorageConfig: async () => ({ bucket: 'unused-by-these-tests' })
}));

const {
  validateFileStorageSave,
  verifyS3Connection,
  verifyAzureConnection,
  verifyGcsConnection
} = await import('../../verifyConnection.js');

describe('verifyConnection', () => {
  beforeEach(() => {
    s3Constructed.length = 0;
    headBucketError = null;
    azureParseError = null;
    azureGetPropertiesError = null;
    azureCalls.length = 0;
    gcsConstructed.length = 0;
    gcsGetFilesError = null;
    gcsGetFilesCalls.length = 0;
    overrides = {};
  });

  describe('validateFileStorageSave gate', () => {
    it('lets non-cloud saves through without touching any client', async () => {
      expect(await validateFileStorageSave({ storeName: 'x' })).toBeNull();
      expect(await validateFileStorageSave({ fileStorage: 'local' })).toBeNull();
      expect(s3Constructed).toHaveLength(0);
      expect(azureCalls).toHaveLength(0);
    });

    it('builds the S3 candidate from the body with single-attempt timeouts', async () => {
      const result = await validateFileStorageSave({
        fileStorage: 's3',
        s3Bucket: ' shop ',
        s3Region: 'fsn1',
        s3AccessKeyId: 'key',
        s3SecretAccessKey: 'secret',
        s3Endpoint: 'https://fsn1.your-objectstorage.com',
        s3ForcePathStyle: true
      });
      expect(result).toBeNull();
      expect(s3Constructed[0]).toMatchObject({
        maxAttempts: 1,
        requestHandler: { connectionTimeout: 5000, requestTimeout: 10000 },
        region: 'fsn1',
        endpoint: 'https://fsn1.your-objectstorage.com',
        forcePathStyle: true,
        credentials: { accessKeyId: 'key', secretAccessKey: 'secret' }
      });
    });

    it('lets config/env overrides win over submitted values', async () => {
      overrides = { s3Bucket: 'pinned-bucket' };
      await validateFileStorageSave({
        fileStorage: 's3',
        s3Bucket: 'body-bucket',
        s3Region: 'us-east-1'
      });
      // The pinned bucket is what runtime will use — that's what gets tested
      expect(s3Constructed).toHaveLength(1);
    });

    it('omits credentials when not fully provided (SDK default chain)', async () => {
      await validateFileStorageSave({
        fileStorage: 's3',
        s3Bucket: 'shop',
        s3Region: 'us-east-1',
        s3AccessKeyId: 'key-only'
      });
      expect(s3Constructed[0].credentials).toBeUndefined();
    });
  });

  describe('verifyS3Connection', () => {
    it('requires a bucket', async () => {
      expect(await verifyS3Connection({})).toMatch(/bucket name is required/i);
    });

    it('maps common failures to merchant-readable reasons', async () => {
      headBucketError = { name: 'NotFound', $metadata: { httpStatusCode: 404 } };
      expect(await verifyS3Connection({ bucket: 'shop' })).toMatch(
        /was not found/
      );
      headBucketError = {
        name: 'PermanentRedirect',
        $metadata: { httpStatusCode: 301 }
      };
      expect(await verifyS3Connection({ bucket: 'shop' })).toMatch(
        /different region/
      );
      headBucketError = { name: 'Forbidden', $metadata: { httpStatusCode: 403 } };
      expect(await verifyS3Connection({ bucket: 'shop' })).toMatch(
        /access was denied/
      );
      headBucketError = { name: 'TimeoutError', message: 'socket timed out' };
      expect(await verifyS3Connection({ bucket: 'shop' })).toMatch(
        /TimeoutError: socket timed out/
      );
    });

    it('returns null when the bucket answers', async () => {
      expect(await verifyS3Connection({ bucket: 'shop' })).toBeNull();
    });
  });

  describe('verifyGcsConnection', () => {
    const validKey = JSON.stringify({
      project_id: 'proj',
      client_email: 'svc@proj.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n'
    });

    it('requires a bucket', async () => {
      expect(await verifyGcsConnection({})).toMatch(/bucket name is required/i);
    });

    it('probes with a single-object listing and no retries', async () => {
      expect(
        await verifyGcsConnection({
          bucket: 'shop',
          serviceAccountKey: validKey
        })
      ).toBeNull();
      expect(gcsConstructed[0]).toMatchObject({
        retryOptions: { autoRetry: false },
        projectId: 'proj'
      });
      expect(gcsGetFilesCalls[0]).toMatchObject({
        name: 'shop',
        options: { maxResults: 1, autoPaginate: false }
      });
    });

    it('reports malformed and incomplete key files', async () => {
      expect(
        await verifyGcsConnection({
          bucket: 'shop',
          serviceAccountKey: 'garbage'
        })
      ).toMatch(/not valid JSON/);
      expect(
        await verifyGcsConnection({
          bucket: 'shop',
          serviceAccountKey: '{"client_email":"x"}'
        })
      ).toMatch(/missing "client_email" or "private_key"/);
    });

    it('maps common failures to merchant-readable reasons', async () => {
      gcsGetFilesError = { code: 404, message: 'Not Found' };
      expect(
        await verifyGcsConnection({ bucket: 'shop', serviceAccountKey: validKey })
      ).toMatch(/was not found/);
      gcsGetFilesError = { code: 403, message: 'Forbidden' };
      expect(
        await verifyGcsConnection({ bucket: 'shop', serviceAccountKey: validKey })
      ).toMatch(/access was denied/);
    });

    it('is reachable through the save gate', async () => {
      const result = await validateFileStorageSave({
        fileStorage: 'gcs',
        gcsBucket: 'shop',
        gcsServiceAccountKey: validKey
      });
      expect(result).toBeNull();
      expect(gcsGetFilesCalls).toHaveLength(1);
    });
  });

  describe('verifyAzureConnection', () => {
    it('requires a connection string', async () => {
      expect(await verifyAzureConnection({})).toMatch(
        /connection string is required/i
      );
    });

    it('verifies with a single attempt and returns null on success', async () => {
      expect(
        await verifyAzureConnection({ connectionString: 'AccountName=a;AccountKey=k=' })
      ).toBeNull();
      expect(azureCalls[0].options).toMatchObject({
        retryOptions: { maxTries: 1, tryTimeoutInMs: 10000 }
      });
    });

    it('reports malformed connection strings', async () => {
      azureParseError = new Error('Invalid EndpointSuffix in the provided Connection String');
      expect(
        await verifyAzureConnection({ connectionString: 'garbage' })
      ).toMatch(/Invalid EndpointSuffix/);
    });

    it('maps authentication failures', async () => {
      azureGetPropertiesError = { statusCode: 403, code: 'AuthenticationFailed' };
      expect(
        await verifyAzureConnection({ connectionString: 'AccountName=a;AccountKey=bad=' })
      ).toMatch(/authentication failed/);
    });
  });
});
