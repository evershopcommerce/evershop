import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/* Fake AWS SDK: commands record their input; the client records every send
   and answers ListObjectsV2 from a scripted queue. */
class PutObjectCommand {
  commandName = 'PutObjectCommand';

  constructor(public input: any) {}
}
class DeleteObjectCommand {
  commandName = 'DeleteObjectCommand';

  constructor(public input: any) {}
}
class ListObjectsV2Command {
  commandName = 'ListObjectsV2Command';

  constructor(public input: any) {}
}

const sent: any[] = [];
let listResponses: any[] = [];
const constructedWith: any[] = [];

class S3Client {
  config = { region: async () => 'eu-west-1' };

  constructor(options: any) {
    constructedWith.push(options);
  }

  async send(command: any) {
    sent.push(command);
    if (command.commandName === 'ListObjectsV2Command') {
      return listResponses.shift() || {};
    }
    return {};
  }
}

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
}));

let s3Config: any = {};
jest.unstable_mockModule('../../storageConfig.js', () => ({
  getS3StorageConfig: async () => s3Config,
  setResolvedS3Region: jest.fn()
}));

const { s3FileUploader, s3FileBrowser, s3FileDeleter, s3FolderCreator } =
  await import('../../s3/s3Storage.js');

const file = (filename: string): any => ({
  filename,
  mimetype: 'image/png',
  size: 10,
  buffer: Buffer.from('x')
});

describe('s3Storage', () => {
  beforeEach(() => {
    sent.length = 0;
    listResponses = [];
    s3Config = { bucket: 'my-bucket', region: 'eu-west-1', forcePathStyle: false };
  });

  it('uploads with ContentType and returns a region-qualified, encoded URL', async () => {
    const results = await s3FileUploader.upload(
      [file('cat.png')],
      'catalog/my folder'
    );
    const put = sent.find((c) => c.commandName === 'PutObjectCommand');
    expect(put.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'catalog/my folder/cat.png',
      ContentType: 'image/png'
    });
    expect(results[0].url).toBe(
      'https://my-bucket.s3.eu-west-1.amazonaws.com/catalog/my%20folder/cat.png'
    );
    expect(results[0]).toMatchObject({
      name: 'cat.png',
      mimetype: 'image/png',
      size: 10
    });
  });

  it('normalizes leading/duplicate slashes and backslashes in the path', async () => {
    await s3FileUploader.upload([file('a.png')], '/catalog//sub\\deep/');
    const put = sent.find((c) => c.commandName === 'PutObjectCommand');
    expect(put.input.Key).toBe('catalog/sub/deep/a.png');
  });

  it('prefers the configured base URL (CDN) for file URLs', async () => {
    s3Config = { bucket: 'my-bucket', baseUrl: 'https://cdn.example.com/' };
    const results = await s3FileUploader.upload([file('a b.png')], 'x');
    expect(results[0].url).toBe('https://cdn.example.com/x/a%20b.png');
  });

  it('uses path-style URLs on a custom endpoint with forcePathStyle (MinIO)', async () => {
    s3Config = {
      bucket: 'shop',
      endpoint: 'https://minio.internal:9000',
      forcePathStyle: true
    };
    const results = await s3FileUploader.upload([file('a.png')], '');
    expect(results[0].url).toBe('https://minio.internal:9000/shop/a.png');
  });

  it('uses virtual-hosted URLs on a custom endpoint by default (Hetzner)', async () => {
    s3Config = {
      bucket: 'shop',
      endpoint: 'https://fsn1.your-objectstorage.com',
      forcePathStyle: false
    };
    const results = await s3FileUploader.upload([file('a.png')], '');
    expect(results[0].url).toBe(
      'https://shop.fsn1.your-objectstorage.com/a.png'
    );
  });

  it('relaxes SDK default checksums only for custom endpoints', async () => {
    s3Config = {
      bucket: 'shop',
      endpoint: 'https://fsn1.your-objectstorage.com/relaxed',
      forcePathStyle: false
    };
    await s3FileUploader.upload([file('a.png')], '');
    const endpointClient = constructedWith[constructedWith.length - 1];
    expect(endpointClient).toMatchObject({
      endpoint: 'https://fsn1.your-objectstorage.com/relaxed',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    });

    s3Config = { bucket: 'aws-bucket', region: 'us-east-2' };
    await s3FileUploader.upload([file('a.png')], '');
    const awsClient = constructedWith[constructedWith.length - 1];
    expect(awsClient.requestChecksumCalculation).toBeUndefined();
    expect(awsClient.responseChecksumValidation).toBeUndefined();
  });

  it('paginates the listing across continuation tokens', async () => {
    listResponses = [
      {
        CommonPrefixes: [{ Prefix: 'catalog/sub1/' }],
        Contents: [
          { Key: 'catalog/', Size: 0 },
          { Key: 'catalog/one.png', Size: 5 }
        ],
        IsTruncated: true,
        NextContinuationToken: 'token-1'
      },
      {
        CommonPrefixes: [{ Prefix: 'catalog/sub2/' }],
        Contents: [{ Key: 'catalog/empty.txt', Size: 0 }],
        IsTruncated: false
      }
    ];
    const { files, folders } = await s3FileBrowser.list('catalog');
    const lists = sent.filter((c) => c.commandName === 'ListObjectsV2Command');
    expect(lists).toHaveLength(2);
    expect(lists[0].input).toMatchObject({
      Bucket: 'my-bucket',
      Prefix: 'catalog/',
      Delimiter: '/'
    });
    expect(lists[0].input.ContinuationToken).toBeUndefined();
    expect(lists[1].input.ContinuationToken).toBe('token-1');
    expect(folders).toEqual(['sub1', 'sub2']);
    // The folder marker (`catalog/`) is excluded by key; the genuine
    // zero-byte file (`empty.txt`) is kept.
    expect(files.map((f) => f.name)).toEqual(['one.png', 'empty.txt']);
    expect(files[0].url).toBe(
      'https://my-bucket.s3.eu-west-1.amazonaws.com/catalog/one.png'
    );
  });

  it('deletes with a single idempotent DeleteObject (no Head precheck)', async () => {
    await expect(s3FileDeleter.delete('catalog/gone.png')).resolves.toBeUndefined();
    expect(sent).toHaveLength(1);
    expect(sent[0].commandName).toBe('DeleteObjectCommand');
    expect(sent[0].input).toEqual({
      Bucket: 'my-bucket',
      Key: 'catalog/gone.png'
    });
  });

  it('rejects an empty delete path', async () => {
    await expect(s3FileDeleter.delete('//')).rejects.toThrow(
      'Requested path is empty'
    );
    expect(sent).toHaveLength(0);
  });

  it('creates a zero-byte folder marker and returns the normalized path', async () => {
    const created = await s3FolderCreator.create('/new folder//');
    expect(created).toBe('new folder');
    expect(sent[0].input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'new folder/',
      Body: ''
    });
  });
});
