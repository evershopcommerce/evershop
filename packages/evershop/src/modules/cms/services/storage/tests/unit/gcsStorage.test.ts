import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/* Fake GCS SDK: capture constructor options, file saves/deletes, scripted
   getFiles pages. */
const storageConstructed: any[] = [];
const saveCalls: any[] = [];
const deleteCalls: any[] = [];
let getFilesCalls: any[] = [];
let getFilesPages: any[] = [];

const bucketObject = {
  file: (name: string) => ({
    save: async (data: any, options: any) => {
      saveCalls.push({ name, data, options });
    },
    delete: async (options: any) => {
      deleteCalls.push({ name, options });
    }
  }),
  getFiles: async (options: any) => {
    getFilesCalls.push(options);
    return getFilesPages.shift() || [[], null, {}];
  }
};

class Storage {
  constructor(options?: any) {
    storageConstructed.push(options);
  }

  bucket() {
    return bucketObject;
  }
}
jest.unstable_mockModule('@google-cloud/storage', () => ({ Storage }));

let gcsConfig: any = {};
jest.unstable_mockModule('../../storageConfig.js', () => ({
  getGcsStorageConfig: async () => gcsConfig
}));

const { gcsFileUploader, gcsFileBrowser, gcsFileDeleter, gcsFolderCreator } =
  await import('../../gcs/gcsStorage.js');

const file = (filename: string): any => ({
  filename,
  mimetype: 'image/png',
  size: 10,
  buffer: Buffer.from('x')
});

/* Distinct key per config so the client cache in gcsClient never leaks
   between test cases. */
let keyCounter = 0;
const serviceAccountKey = () => {
  keyCounter += 1;
  return JSON.stringify({
    project_id: `proj-${keyCounter}`,
    client_email: `svc-${keyCounter}@proj.iam.gserviceaccount.com`,
    private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n'
  });
};

describe('gcsStorage', () => {
  beforeEach(() => {
    storageConstructed.length = 0;
    saveCalls.length = 0;
    deleteCalls.length = 0;
    getFilesCalls = [];
    getFilesPages = [];
    gcsConfig = { bucket: 'my-bucket', serviceAccountKey: serviceAccountKey() };
  });

  it('uploads with contentType, single-request, and returns the documented public URL', async () => {
    const results = await gcsFileUploader.upload(
      [file('cat.png')],
      'catalog/my folder'
    );
    expect(saveCalls[0]).toMatchObject({
      name: 'catalog/my folder/cat.png',
      options: { resumable: false, contentType: 'image/png' }
    });
    expect(results[0].url).toBe(
      'https://storage.googleapis.com/my-bucket/catalog/my%20folder/cat.png'
    );
  });

  it('parses the service-account key into client credentials', async () => {
    await gcsFileUploader.upload([file('a.png')], '');
    const constructed = storageConstructed[storageConstructed.length - 1];
    expect(constructed.projectId).toMatch(/^proj-/);
    expect(constructed.credentials.client_email).toMatch(
      /@proj\.iam\.gserviceaccount\.com$/
    );
  });

  it('uses Application Default Credentials when no key is configured', async () => {
    gcsConfig = { bucket: 'my-bucket' };
    await gcsFileUploader.upload([file('a.png')], '');
    expect(storageConstructed[storageConstructed.length - 1]).toBeUndefined();
  });

  it('prefers the configured base URL (CDN) for file URLs', async () => {
    gcsConfig = {
      bucket: 'my-bucket',
      serviceAccountKey: serviceAccountKey(),
      baseUrl: 'https://cdn.example.com/'
    };
    const results = await gcsFileUploader.upload([file('a b.png')], 'x');
    expect(results[0].url).toBe('https://cdn.example.com/x/a%20b.png');
  });

  it('lists one level with pagination: prefixes to folders, marker excluded', async () => {
    getFilesPages = [
      [
        [{ name: 'catalog/' }, { name: 'catalog/one.png' }],
        { pageToken: 'token-1' },
        { prefixes: ['catalog/sub1/'] }
      ],
      [[{ name: 'catalog/empty.txt' }], null, { prefixes: ['catalog/sub2/'] }]
    ];
    const { files, folders } = await gcsFileBrowser.list('catalog');
    expect(getFilesCalls).toHaveLength(2);
    expect(getFilesCalls[0]).toMatchObject({
      prefix: 'catalog/',
      delimiter: '/',
      autoPaginate: false
    });
    expect(getFilesCalls[0].pageToken).toBeUndefined();
    expect(getFilesCalls[1].pageToken).toBe('token-1');
    expect(folders).toEqual(['sub1', 'sub2']);
    expect(files.map((f) => f.name)).toEqual(['one.png', 'empty.txt']);
    expect(files[0].url).toBe(
      'https://storage.googleapis.com/my-bucket/catalog/one.png'
    );
  });

  it('deletes idempotently via ignoreNotFound', async () => {
    await expect(
      gcsFileDeleter.delete('catalog/gone.png')
    ).resolves.toBeUndefined();
    expect(deleteCalls[0]).toEqual({
      name: 'catalog/gone.png',
      options: { ignoreNotFound: true }
    });
  });

  it('rejects an empty delete path', async () => {
    await expect(gcsFileDeleter.delete('//')).rejects.toThrow(
      'Requested path is empty'
    );
    expect(deleteCalls).toHaveLength(0);
  });

  it('creates a zero-byte folder marker and returns the normalized path', async () => {
    const created = await gcsFolderCreator.create('/new folder//');
    expect(created).toBe('new folder');
    expect(saveCalls[0]).toMatchObject({
      name: 'new folder/',
      data: '',
      options: { resumable: false }
    });
  });
});
