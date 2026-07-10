import { PassThrough } from 'node:stream';
import { describe, it, expect } from '@jest/globals';

const customMemoryStorage = (await import('../../CustomMemoryStorage.js'))
  .default;

const handle = (
  storage: any,
  file: { originalname: string; mimetype: string; stream: PassThrough }
): Promise<{ error: any; info: any }> =>
  new Promise((resolve) => {
    storage._handleFile({}, file, (error: any, info: any) =>
      resolve({ error, info })
    );
  });

describe('CustomMemoryStorage per-type size enforcement', () => {
  it('buffers a file under its limit', async () => {
    const storage = customMemoryStorage({
      filename: (name: string) => name,
      // ~105 bytes
      fileSizeLimitMb: () => 0.0001
    });
    const stream = new PassThrough();
    const pending = handle(storage, {
      originalname: 'ok.png',
      mimetype: 'image/png',
      stream
    });
    stream.end(Buffer.alloc(50));
    const { error, info } = await pending;
    expect(error).toBeNull();
    expect(info).toMatchObject({ filename: 'ok.png', size: 50 });
    expect(Buffer.isBuffer(info.buffer)).toBe(true);
  });

  it('rejects while streaming once the per-type limit is exceeded', async () => {
    const limits: string[] = [];
    const storage = customMemoryStorage({
      filename: (name: string) => name,
      fileSizeLimitMb: (file: { mimetype: string }) => {
        limits.push(file.mimetype);
        return 0.0001; // ~105 bytes
      }
    });
    const stream = new PassThrough();
    const pending = handle(storage, {
      originalname: 'big.png',
      mimetype: 'image/png',
      stream
    });
    stream.write(Buffer.alloc(80));
    stream.write(Buffer.alloc(80));
    const { error } = await pending;
    expect(error.code).toBe('LIMIT_FILE_SIZE');
    expect(error.limitMb).toBe(0.0001);
    expect(error.mimetype).toBe('image/png');
    expect(limits).toEqual(['image/png']);
  });

  it('applies no limit when no resolver is provided (legacy behavior)', async () => {
    const storage = customMemoryStorage({ filename: (name: string) => name });
    const stream = new PassThrough();
    const pending = handle(storage, {
      originalname: 'any.png',
      mimetype: 'image/png',
      stream
    });
    stream.end(Buffer.alloc(500));
    const { error, info } = await pending;
    expect(error).toBeNull();
    expect(info.size).toBe(500);
  });
});
