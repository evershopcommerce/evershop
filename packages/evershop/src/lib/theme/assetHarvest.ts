import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AssetRecord } from './assets.js';
import { ASSET_TOKEN_PREFIX, THEME_ASSETS_DIR, isSafeAssetPath } from './assets.js';

/**
 * Turning a store's images into a theme's assets, at export time.
 *
 * `theme:export-content` reads content a theme author built in the page
 * builder, where every image is a file in the store's own storage — a URL that
 * means nothing on anyone else's store. Harvesting closes the loop opened by
 * `assets.ts`: each such image is copied into the theme's `public/` folder, the
 * setting that pointed at it becomes a `theme-asset:` token, and the file is
 * added to `assets[]`. The author never hand-writes that list; declaring is a
 * by-product of exporting.
 *
 * Only images the STORE owns are taken. A link to somebody else's CDN is left
 * exactly as it is and reported: copying it would silently re-host a third
 * party's file, and the author may well have meant to hotlink it.
 */

const MEDIA_EXT = /\.(jpe?g|png|webp|avif|gif|svg|ico)$/i;

export interface HarvestedAsset {
  /** Path inside the theme's `public/`, and the asset's identity. */
  path: string;
  /** Where the bytes came from: a storage-relative path or an absolute URL. */
  source: string;
  bytes: number;
}

export interface SkippedAsset {
  value: string;
  reason: 'external' | 'unreadable' | 'unsafe-path';
}

export interface HarvestResult<T> {
  value: T;
  assets: AssetRecord[];
  harvested: HarvestedAsset[];
  skipped: SkippedAsset[];
}

/** Reads an image the store owns. Injected so export stays testable offline. */
export type AssetReader = (source: string) => Promise<Buffer>;

export interface HarvestOpts {
  themeDir: string;
  read: AssetReader;
  /**
   * Is this value a file THIS store owns? Default: any root-relative path.
   * The CLI widens it with the configured storage's own origin, so an S3 store's
   * absolute URLs are harvested too while foreign hosts are not.
   */
  isStoreOwned?: (value: string) => boolean;
}

const defaultIsStoreOwned = (value: string): boolean => value.startsWith('/');

/**
 * The path an image takes inside the theme. The store's own folder structure is
 * kept (minus the `/assets/` and `media/` prefixes the URL builder adds), so two
 * files that lived in different folders cannot collide on their basename.
 */
export function themePathFor(value: string): string | null {
  let p = value;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) {
      p = new URL(p).pathname;
    }
  } catch {
    return null;
  }
  p = p.split('?')[0].split('#')[0];
  p = decodeURIComponent(p).replace(/^\/+/, '');
  p = p.replace(/^assets\//, '').replace(/^media\//, '');
  return isSafeAssetPath(p) ? p : null;
}

/** Does this string look like an image file (rather than a page link or a token)? */
export function looksLikeImage(value: string): boolean {
  if (!value || value.startsWith(ASSET_TOKEN_PREFIX) || value.startsWith('data:')) {
    return false;
  }
  return MEDIA_EXT.test(value.split('?')[0]);
}

/**
 * Copy every store-owned image in `value` into the theme and replace it with a
 * token. Returns a new value; the input is untouched.
 */
export async function harvestAssets<T>(
  value: T,
  opts: HarvestOpts
): Promise<HarvestResult<T>> {
  const isStoreOwned = opts.isStoreOwned ?? defaultIsStoreOwned;
  const harvested: HarvestedAsset[] = [];
  const skipped: SkippedAsset[] = [];
  // value → replacement, so the same image used by five widgets is copied once.
  const decided = new Map<string, string>();

  const decide = async (raw: string): Promise<string> => {
    const known = decided.get(raw);
    if (known !== undefined) {
      return known;
    }
    let replacement = raw;
    if (!isStoreOwned(raw)) {
      skipped.push({ value: raw, reason: 'external' });
    } else {
      const target = themePathFor(raw);
      if (!target) {
        skipped.push({ value: raw, reason: 'unsafe-path' });
      } else {
        try {
          const buffer = await opts.read(raw);
          const file = path.join(opts.themeDir, THEME_ASSETS_DIR, target);
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, buffer);
          harvested.push({ path: target, source: raw, bytes: buffer.length });
          replacement = `${ASSET_TOKEN_PREFIX}${target}`;
        } catch {
          // A file the store lists but cannot serve (deleted behind the widget's
          // back, permissions, a dead bucket) must not fail the whole export.
          skipped.push({ value: raw, reason: 'unreadable' });
        }
      }
    }
    decided.set(raw, replacement);
    return replacement;
  };

  const walk = async (node: unknown): Promise<unknown> => {
    if (typeof node === 'string') {
      return looksLikeImage(node) ? decide(node) : node;
    }
    if (Array.isArray(node)) {
      const out: unknown[] = [];
      for (const item of node) {
        out.push(await walk(item));
      }
      return out;
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = await walk(v);
      }
      return out;
    }
    return node;
  };

  const next = (await walk(value)) as T;
  // Stable order so a re-export produces the same file, not a reshuffled one.
  const assets = [...new Set(harvested.map((h) => h.path))]
    .sort()
    .map((p) => ({ path: p }));
  return { value: next, assets, harvested, skipped };
}
