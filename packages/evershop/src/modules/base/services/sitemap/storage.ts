import fsp from 'fs/promises';
import path from 'path';
import { CONSTANTS } from '../../../../lib/helpers.js';
import { getValueSync } from '../../../../lib/util/registry.js';

/** One file to write: a bare filename (e.g. `sitemap.xml`, `sitemap-products.xml`) + its content. */
export interface SitemapFile {
  name: string;
  content: string;
}

/** Persisted generation metadata (cache sidecar, never web-served). */
export interface SitemapMeta {
  fingerprint: string;
  generatedAt: string;
  files: string[];
  urlCount: number;
}

export interface SitemapStorage {
  writeFiles(files: SitemapFile[]): Promise<void>;
  readFile(name: string): Promise<Buffer | null>;
  fileExists(name: string): Promise<boolean>;
  readMeta(): Promise<SitemapMeta | null>;
  writeMeta(meta: SitemapMeta): Promise<void>;
  pruneOrphans(keep: string[]): Promise<void>;
}

/** Only files matching this are eligible for pruning — never touch a merchant's other public files. */
const SITEMAP_FILE_RE = /^sitemap(-[a-z0-9-]+)?\.xml$/;

/**
 * Local-disk storage. Output files land flat in the project `public/` folder (served by
 * `publicStatic` at `/sitemap.xml`, `/sitemap-*.xml` — root-level per Google's directory-scope
 * rule, design §12/C4). Metadata lives in the non-web-served cache dir. Writes are atomic
 * (tmp + rename, pid-scoped tmp name so concurrent processes don't clash). Dirs injectable for tests.
 */
export function createLocalSitemapStorage(options?: {
  publicDir?: string;
  cacheDir?: string;
}): SitemapStorage {
  const publicDir = options?.publicDir ?? CONSTANTS.PUBLICPATH;
  const cacheDir = options?.cacheDir ?? path.join(CONSTANTS.CACHEPATH, 'sitemap');
  const metaPath = path.join(cacheDir, 'meta.json');

  async function atomicWrite(
    filePath: string,
    content: string | Buffer
  ): Promise<void> {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, content);
    await fsp.rename(tmp, filePath);
  }

  return {
    async writeFiles(files) {
      for (const file of files) {
        await atomicWrite(path.join(publicDir, file.name), file.content);
      }
    },
    async readFile(name) {
      try {
        return await fsp.readFile(path.join(publicDir, name));
      } catch {
        return null;
      }
    },
    async fileExists(name) {
      try {
        return (await fsp.stat(path.join(publicDir, name))).isFile();
      } catch {
        return false;
      }
    },
    async readMeta() {
      try {
        return JSON.parse(await fsp.readFile(metaPath, 'utf8')) as SitemapMeta;
      } catch {
        return null;
      }
    },
    async writeMeta(meta) {
      await atomicWrite(metaPath, JSON.stringify(meta, null, 2));
    },
    async pruneOrphans(keep) {
      const keepSet = new Set(keep);
      let entries: string[];
      try {
        entries = await fsp.readdir(publicDir);
      } catch {
        return;
      }
      await Promise.all(
        entries.map(async (name) => {
          if (SITEMAP_FILE_RE.test(name) && !keepSet.has(name)) {
            await fsp.rm(path.join(publicDir, name), { force: true });
          }
        })
      );
    }
  };
}

/** Default local storage (project `public/` + `.evershop/sitemap/`). */
export const localSitemapStorage = createLocalSitemapStorage();

/**
 * The active storage, resolved through the registry so an extension (e.g. S3) can redirect output
 * by registering a `sitemapStorage` processor. Defaults to local disk (design §9).
 */
export function getSitemapStorage(): SitemapStorage {
  return getValueSync<SitemapStorage>('sitemapStorage', localSitemapStorage, {});
}
