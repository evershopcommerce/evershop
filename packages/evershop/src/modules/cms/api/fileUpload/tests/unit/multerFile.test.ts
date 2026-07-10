import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import multer from 'multer';

/* The middleware creates a fresh multer per request; script its outcome. */
let uploadError: Error | null = null;
const arrayCalls: any[] = [];
jest.unstable_mockModule('../../../../services/getMulter.js', () => ({
  getMulter: () => ({
    array: (field: string, maxCount: number) => {
      arrayCalls.push({ field, maxCount });
      return (_req: unknown, _res: unknown, cb: (e?: Error | null) => void) =>
        cb(uploadError);
    }
  }),
  getUploadHardCapMb: () => 10
}));

const middleware = (
  await import('../../[auth,validatePath]multerFile.js')
).default;

const makeResponse = () => {
  const response: any = {
    statusCode: undefined,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
    }
  };
  return response;
};

const run = (path: string) => {
  const request = { params: { 0: path } };
  const response = makeResponse();
  const next = jest.fn();
  middleware(request, response, next);
  return { response, next };
};

describe('upload multer middleware (shared by /api/files and /api/images)', () => {
  beforeEach(() => {
    uploadError = null;
    arrayCalls.length = 0;
  });

  it('accepts up to 20 files on the "images" field and calls next on success', () => {
    const { response, next } = run('catalog');
    expect(arrayCalls[0]).toEqual({ field: 'images', maxCount: 20 });
    expect(next).toHaveBeenCalled();
    expect(response.statusCode).toBeUndefined();
  });

  it('rejects invalid path characters before touching multer', () => {
    const { response, next } = run('../escape');
    expect(response.statusCode).toBe(400);
    expect(response.payload.error.message).toMatch(/Invalid path/);
    expect(next).not.toHaveBeenCalled();
    expect(arrayCalls).toHaveLength(0);
  });

  it('maps the multer hard-cap error to a readable 400 with the limit', () => {
    uploadError = new multer.MulterError('LIMIT_FILE_SIZE');
    const { response, next } = run('catalog');
    expect(response.statusCode).toBe(400);
    expect(response.payload.error.message).toBe(
      'The file is too large. The maximum allowed size is 10 MB.'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('maps the per-type limit error with the type and its own limit', () => {
    const error: any = new Error('File too large');
    error.code = 'LIMIT_FILE_SIZE';
    error.limitMb = 200;
    error.mimetype = 'video/mp4';
    uploadError = error;
    const { response, next } = run('catalog');
    expect(response.statusCode).toBe(400);
    expect(response.payload.error.message).toBe(
      'The file is too large. The maximum allowed size for video/mp4 files is 200 MB.'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns the fileFilter rejection as a 400 instead of a 500', () => {
    uploadError = new Error(
      'The file you are trying to upload is not allowed'
    );
    const { response, next } = run('catalog');
    expect(response.statusCode).toBe(400);
    expect(response.payload.error.message).toBe(
      'The file you are trying to upload is not allowed'
    );
    expect(next).not.toHaveBeenCalled();
  });
});
