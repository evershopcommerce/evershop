import { ImageError } from './types.js';

/**
 * The URL of an image (IMG-01): `http` or `https`, with a host, and no user
 * name or password. Throws `ImageError('invalid_url')`.
 */
export function parseImageUrl(text: string): URL {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new ImageError('invalid_url');
  }
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.hostname === ''
  ) {
    throw new ImageError('invalid_url');
  }
  return url;
}
