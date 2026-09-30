import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { mimeFor } from '../util/mime.js';

/**
 * Image (and other binary) files a theme ships with its content
 * (`theme.json` → `assets[]`).
 *
 * A widget setting holds a URL, so a theme that wants to ship a banner has
 * historically had two bad options: reference a file in its own `public/`
 * folder (renders through the image processor's theme fallback, but the file is
 * never in the store's media storage — invisible to the file browser, local
 * even when the store is on S3, and dead the moment the theme changes), or ship
 * no image at all. `assets[]` closes that: the file travels with the theme,
 * `theme:active` uploads it through the configured storage provider, and the
 * settings that referenced it are rewritten to the URL the upload returned.
 *
 * A setting refers to an asset by TOKEN, never by URL:
 *
 *   "image": "theme-asset:demo/hero.jpg"
 *
 * The token is what the manifest and the install snapshot carry, so it is
 * stable across stores and across storage providers. Resolution to a real URL
 * happens in memory, on both sides of the three-way diff, which is what keeps
 * an upgrade from reading as "the author changed this image" (see
 * `resolveAssetTokens`).
 */

/**
 * Declared files live in the theme's existing `public/` folder — deliberately
 * not a second asset directory. A declared file therefore stays reachable the
 * way it always was (the theme serves `public/` at the URL root, and
 * `imageProcessor.ts` falls back to it for an `/assets/` path) AND is uploaded
 * into the store's storage. The token in a setting decides which one is used.
 */
export const THEME_ASSETS_DIR = 'public';

/** `theme-asset:<path>` — the reference a widget setting carries. */
export const ASSET_TOKEN_PREFIX = 'theme-asset:';

const TOKEN_RE = /theme-asset:([A-Za-z0-9._\-/]+)/g;

export interface AssetRecord {
  /** Path relative to `themes/<id>/public/`, e.g. `demo/hero.jpg`. Also the asset's identity. */
  path: string;
}

export interface UploadedAsset {
  path: string;
  url: string;
}

/** The upload seam, injected so install stays testable and `lib/` stays free of a hard cms import. */
export type AssetUploader = (
  files: { filename: string; buffer: Buffer; mimetype: string; size: number }[],
  destinationPath: string
) => Promise<{ name: string; url: string }[]>;

export function assetToken(assetPath: string): string {
  return `${ASSET_TOKEN_PREFIX}${assetPath}`;
}

/**
 * Is `p` a safe theme-relative asset path? Rejects absolute paths, `..`
 * traversal, backslashes and empty segments — a manifest is data, and it
 * decides which files the installer reads off disk.
 */
export function isSafeAssetPath(p: unknown): p is string {
  if (typeof p !== 'string' || p.length === 0 || p.length > 255) {
    return false;
  }
  if (p.startsWith('/') || p.includes('\\') || /^[a-zA-Z]:/.test(p)) {
    return false;
  }
  const segments = p.split('/');
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    return false;
  }
  return /\.[A-Za-z0-9]+$/.test(p);
}

/** Every `theme-asset:` token appearing anywhere in a value tree. */
export function collectAssetTokens(value: unknown): Set<string> {
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      for (const m of node.matchAll(TOKEN_RE)) {
        found.add(m[1]);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(walk);
    }
  };
  walk(value);
  return found;
}

/**
 * Replace every `theme-asset:<path>` with its uploaded URL, deeply, returning a
 * new value. A token with no entry in `urls` is left as it is: the diff then
 * sees the same unresolved string on both sides, so an asset that failed to
 * upload cannot silently turn into a broken URL in the database.
 */
export function resolveAssetTokens<T>(value: T, urls: Map<string, string>): T {
  if (urls.size === 0) {
    return value;
  }
  const replace = (s: string): string =>
    s.replace(TOKEN_RE, (whole, p) => urls.get(p) ?? whole);
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      return replace(node);
    }
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  };
  return walk(value) as T;
}

/** Where an asset lands in storage: `theme/<themeId>/<dir>`, filename kept. */
export function assetDestination(
  themeId: string,
  assetPath: string
): {
  destination: string;
  filename: string;
} {
  const dir = path.posix.dirname(assetPath);
  const base = path.posix.join('theme', themeId, dir === '.' ? '' : dir);
  return { destination: base, filename: path.posix.basename(assetPath) };
}

export { mimeFor };

export function assetContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

export interface UploadThemeAssetsResult {
  urls: Map<string, string>;
  uploaded: UploadedAsset[];
  missing: string[];
}

/**
 * Upload every declared asset through the store's configured storage provider
 * and return the token → URL map the manifest is resolved with.
 *
 * Uploads are by path, so re-running activation overwrites the same key rather
 * than accumulating copies. A file that is declared but absent from the theme
 * is reported in `missing` and left unresolved — the caller decides whether
 * that is fatal.
 */
export async function uploadThemeAssets(
  themeDir: string,
  themeId: string,
  assets: AssetRecord[],
  upload: AssetUploader
): Promise<UploadThemeAssetsResult> {
  const urls = new Map<string, string>();
  const uploaded: UploadedAsset[] = [];
  const missing: string[] = [];
  // Group by destination folder: one upload call per folder, as the providers expect.
  const byDestination = new Map<
    string,
    { filename: string; assetPath: string }[]
  >();
  for (const asset of assets) {
    const file = path.join(themeDir, THEME_ASSETS_DIR, asset.path);
    try {
      const info = await stat(file);
      if (!info.isFile()) {
        missing.push(asset.path);
        continue;
      }
    } catch {
      missing.push(asset.path);
      continue;
    }
    const { destination, filename } = assetDestination(themeId, asset.path);
    const list = byDestination.get(destination) ?? [];
    list.push({ filename, assetPath: asset.path });
    byDestination.set(destination, list);
  }
  for (const [destination, entries] of byDestination) {
    const files = await Promise.all(
      entries.map(async (e) => {
        const buffer = await readFile(
          path.join(themeDir, THEME_ASSETS_DIR, e.assetPath)
        );
        return {
          filename: e.filename,
          buffer,
          mimetype: mimeFor(e.assetPath),
          size: buffer.length
        };
      })
    );
    const results = await upload(files, destination);
    results.forEach((r, i) => {
      const assetPath = entries[i].assetPath;
      urls.set(assetPath, r.url);
      uploaded.push({ path: assetPath, url: r.url });
    });
  }
  return { urls, uploaded, missing };
}
