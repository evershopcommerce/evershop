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
class CopyObjectCommand {
  commandName = 'CopyObjectCommand';

  constructor(public input: any) {}
}
class HeadObjectCommand {
  commandName = 'HeadObjectCommand';

  constructor(public input: any) {}
}

const sent: any[] = [];
let listResponses: any[] = [];
/** Keys HeadObject should report as already present. */
let existingKeys: string[] = [];
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
    if (command.commandName === 'HeadObjectCommand') {
      if (existingKeys.includes(command.input.Key)) {
        return {};
      }
      // What S3 returns for a key that is not there.
      const error: any = new Error('NotFound');
      error.$metadata = { httpStatusCode: 404 };
      throw error;
    }
    return {};
  }
}

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand
}));

let s3Config: any = {};
jest.unstable_mockModule('../../storageConfig.js', () => ({
  getS3StorageConfig: async () => s3Config,
  setResolvedS3Region: jest.fn()
}));

const {
  s3FileUploader,
  s3FileBrowser,
  s3FileDeleter,
  s3FolderCreator,
  s3FileRenamer
} = await import('../../s3/s3Storage.js');

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
    existingKeys = [];
    s3Config = {
      bucket: 'my-bucket',
      region: 'eu-west-1',
      forcePathStyle: false
    };
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

  it('returns ONE page and hands back the continuation token as a cursor', async () => {
    // This used to drain every continuation token before returning, so a
    // folder of 50,000 objects cost 50 round trips and one enormous payload.
    // One request per page now; resuming is the caller's to do.
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

    const first = await s3FileBrowser.list('catalog', { limit: 50 });
    let lists = sent.filter((c) => c.commandName === 'ListObjectsV2Command');
    // Two requests: the file page, then one scan to finish enumerating the
    // sub-folders, which S3 interleaves with the objects.
    expect(lists).toHaveLength(2);
    expect(lists[0].input).toMatchObject({
      Bucket: 'my-bucket',
      Prefix: 'catalog/',
      Delimiter: '/',
      // MaxKeys caps CommonPrefixes + Contents together, which is exactly the
      // combined limit the contract promises.
      MaxKeys: 50
    });
    expect(lists[0].input.ContinuationToken).toBeUndefined();
    // BOTH folders, though `sub2` only appears in the second response: the
    // sidebar is navigation and cannot arrive a page at a time.
    expect(first.folders).toEqual(['sub1', 'sub2']);
    // Files are NOT taken from the scan — only the first page's.
    expect(first.files.map((f) => f.name)).toEqual(['one.png']);
    expect(first.files[0].url).toBe(
      'https://my-bucket.s3.eu-west-1.amazonaws.com/catalog/one.png'
    );
    // The cursor is still the first page's, so no file is skipped.
    expect(first.nextCursor).toBe('token-1');
    // The scan uses the biggest page the API allows, to cover ground fast.
    expect(lists[1].input).toMatchObject({
      MaxKeys: 1000,
      ContinuationToken: 'token-1'
    });

    listResponses = [
      { Contents: [{ Key: 'catalog/empty.txt', Size: 0 }], IsTruncated: false }
    ];
    const second = await s3FileBrowser.list('catalog', {
      limit: 50,
      cursor: first.nextCursor as string
    });
    lists = sent.filter((c) => c.commandName === 'ListObjectsV2Command');
    // One request only: a later page never re-scans for folders.
    expect(lists).toHaveLength(3);
    expect(lists[2].input.ContinuationToken).toBe('token-1');
    // The genuine zero-byte file is kept — filtered by key, not by size.
    // A later page never re-sends the folders; the caller has them.
    expect(second.folders).toEqual([]);
    expect(second.files.map((f) => f.name)).toEqual(['empty.txt']);
    expect(second.nextCursor).toBeUndefined();
  });

  it('reports size and type without an extra request per file', async () => {
    // Size is already in the ListObjectsV2 response and used to be discarded;
    // reading it costs nothing. Type comes from the name because S3 listings
    // carry no ContentType at all — only HeadObject does, one call per file.
    listResponses = [
      {
        Contents: [
          { Key: 'catalog/one.png', Size: 2048 },
          { Key: 'catalog/manual.pdf', Size: 91234 },
          { Key: 'catalog/empty.txt', Size: 0 }
        ],
        IsTruncated: false
      }
    ];
    const { files } = await s3FileBrowser.list('catalog', { limit: 50 });
    expect(sent.filter((c) => c.commandName === 'ListObjectsV2Command')).toHaveLength(1);
    expect(files.map((f) => [f.name, f.size, f.mimeType])).toEqual([
      ['one.png', 2048, 'image/png'],
      ['manual.pdf', 91234, 'application/pdf'],
      // A genuine zero-byte file keeps its size rather than losing it.
      ['empty.txt', 0, 'text/plain']
    ]);
  });

  it('pushes a name search down to the S3 key prefix', async () => {
    listResponses = [
      { Contents: [{ Key: 'catalog/apple.png', Size: 1 }], IsTruncated: false }
    ];
    const { files } = await s3FileBrowser.list('catalog', {
      limit: 10,
      prefix: 'app'
    });
    const lists = sent.filter((c) => c.commandName === 'ListObjectsV2Command');
    // Native prefix filter — the bucket is never scanned client-side.
    expect(lists[0].input.Prefix).toBe('catalog/app');
    expect(files.map((f) => f.name)).toEqual(['apple.png']);
  });

  it('deletes with a single idempotent DeleteObject (no Head precheck)', async () => {
    await expect(
      s3FileDeleter.delete('catalog/gone.png')
    ).resolves.toBeUndefined();
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

  describe('rename', () => {
    it('copies then deletes — S3 has no rename', async () => {
      await s3FileRenamer.rename('catalog/old.png', 'catalog/new.png');
      const kinds = sent.map((c) => c.commandName);
      expect(kinds).toEqual([
        'HeadObjectCommand',
        'CopyObjectCommand',
        'DeleteObjectCommand'
      ]);
      const copy = sent.find((c) => c.commandName === 'CopyObjectCommand');
      expect(copy.input).toMatchObject({
        Bucket: 'my-bucket',
        CopySource: 'my-bucket/catalog/old.png',
        Key: 'catalog/new.png'
      });
      // The delete comes last, so an interruption leaves the ORIGINAL intact
      // rather than losing the file between two names.
      expect(sent[sent.length - 1].input.Key).toBe('catalog/old.png');
    });

    it('refuses to overwrite a name that is taken', async () => {
      // CopyObject overwrites silently, and a media folder is shared.
      existingKeys = ['catalog/taken.png'];
      await expect(
        s3FileRenamer.rename('catalog/old.png', 'catalog/taken.png')
      ).rejects.toThrow(/already exists/);
      expect(sent.map((c) => c.commandName)).not.toContain('CopyObjectCommand');
      expect(sent.map((c) => c.commandName)).not.toContain(
        'DeleteObjectCommand'
      );
    });

    it('does nothing when the name is unchanged', async () => {
      await s3FileRenamer.rename('catalog/same.png', 'catalog/same.png');
      expect(sent).toHaveLength(0);
    });
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
