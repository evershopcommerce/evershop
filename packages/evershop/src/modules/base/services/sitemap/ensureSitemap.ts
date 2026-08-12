import { GenerateOptions, generateSitemap } from './generateSitemap.js';
import { SitemapStorage, getSitemapStorage } from './storage.js';

/**
 * Cold-path helper for the serve middleware: return the requested sitemap file, generating the
 * whole set first if it's missing (first boot, or after a cache wipe). Returns `null` for a name
 * that generation doesn't produce (unknown child) so the caller can fall through to a 404.
 * Single-flight-aware via `generateSitemap`.
 */
export async function ensureSitemap(
  fileName: string,
  options: GenerateOptions = {}
): Promise<Buffer | null> {
  const storage: SitemapStorage = options.storage ?? getSitemapStorage();
  if (await storage.fileExists(fileName)) {
    return storage.readFile(fileName);
  }
  await generateSitemap({ ...options, storage, force: true });
  return storage.readFile(fileName);
}
