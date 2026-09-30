import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

/**
 * The file browser must upload through a route that enforces the store's
 * allowed types and NOTHING else.
 *
 * There are two nearly identical upload routes: `fileUpload` (POST
 * /api/files/*) and `imageUpload` (POST /api/images/*). They share a handler
 * and the same multer filter; `imageUpload` adds one middleware that refuses
 * anything whose mimetype does not begin with "image", without consulting any
 * setting. The browser was posting there, so enabling PDF or video in System
 * Setting -> File Uploads changed nothing and the upload failed with "Only
 * images are allowed".
 *
 * This is a wiring bug — nothing about it is visible in either file alone —
 * so it is asserted structurally rather than by reading code.
 */
const apiDir = path.resolve(
  process.cwd(),
  'packages/evershop/src/modules/cms/api'
);
const browserSrc = path.resolve(
  process.cwd(),
  'packages/evershop/src/components/admin/FileBrowser.tsx'
);

const middlewareOf = (route: string) =>
  readdirSync(path.join(apiDir, route)).filter((f) => f.endsWith('.js'));

describe('file browser upload wiring', () => {
  it('uploads through a route with no hard-coded image restriction', () => {
    const source = readFileSync(browserSrc, 'utf8');
    const routeId = source.match(/uploadApi: url\(routeId: "([^"]+)"/)?.[1];
    expect(routeId).toBeDefined();
    expect(
      middlewareOf(routeId as string).some((f) => f.includes('verifyImages'))
    ).toBe(false);
  });

  it('still authenticates and validates the path on that route', () => {
    const source = readFileSync(browserSrc, 'utf8');
    const routeId = source.match(/uploadApi: url\(routeId: "([^"]+)"/)?.[1];
    const middleware = middlewareOf(routeId as string);
    // Dropping the image check must not have dropped the real guards.
    expect(middleware.some((f) => f.includes('auth'))).toBe(true);
    expect(middleware.some((f) => f.includes('validatePath'))).toBe(true);
    expect(middleware.some((f) => f.includes('multerFile'))).toBe(true);
  });

  it('leaves imageUpload images-only for the callers that want that', () => {
    // ImageUploader is a dedicated image control; the guard is correct there.
    expect(
      middlewareOf('imageUpload').some((f) => f.includes('verifyImages'))
    ).toBe(true);
  });
});
