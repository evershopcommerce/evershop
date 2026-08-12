import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';
import {
  getEnabledLanguages,
  getStoreLanguage
} from '../../../setting/services/setting.js';
import { chunk } from './chunk.js';
import { SitemapConfig, getSitemapConfig } from './config.js';
import { expandLocales } from './expandLocales.js';
import {
  FingerprintEntry,
  buildFingerprint,
  hasChanged
} from './fingerprint.js';
import { getSitemapCollectors } from './registry.js';
import { renderIndex } from './render/renderIndex.js';
import { renderUrlset } from './render/renderUrlset.js';
import { SitemapStorage, getSitemapStorage } from './storage.js';
import { SitemapCollector, SitemapUrlRecord } from './types.js';

const INDEX_FILE = 'sitemap.xml';

export interface GenerateOptions {
  /** Rebuild even when the fingerprint is unchanged. */
  force?: boolean;
  // Dependency injection (defaults resolved from config / registry / settings). Used by tests
  // and by callers that already hold these values.
  collectors?: SitemapCollector[];
  storage?: SitemapStorage;
  config?: SitemapConfig;
  baseUrl?: string;
  locales?: string[];
  defaultLocale?: string;
  /** Epoch-ms clock (default `Date.now`) — injectable for deterministic tests. */
  clock?: () => number;
}

export interface GenerateResult {
  /** false ⇒ skipped because the fingerprint was unchanged and the cache is fresh. */
  generated: boolean;
  files: string[];
  fingerprint: string;
  urlCount: number;
}

// Single-flight: concurrent callers (cold-path thundering herd, or a request racing the cron)
// share one in-progress generation instead of each launching their own. Per-process.
let inflight: Promise<GenerateResult> | null = null;

/**
 * Generate the sitemap set (index + per-collector children) into storage, skipping the work when
 * a cheap fingerprint shows nothing changed and the cache is fresh. See wiki/sitemap-design.md §2–§5.
 */
export function generateSitemap(
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  if (inflight) {
    return inflight;
  }
  inflight = runGeneration(options).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function runGeneration(
  options: GenerateOptions
): Promise<GenerateResult> {
  const config = options.config ?? getSitemapConfig();
  const storage = options.storage ?? getSitemapStorage();
  const collectors = options.collectors ?? getSitemapCollectors();
  const baseUrl = options.baseUrl ?? getBaseUrl();
  const locales = options.locales ?? (await getEnabledLanguages());
  const defaultLocale = options.defaultLocale ?? (await getStoreLanguage());
  const now = options.clock ?? Date.now;

  // --- Fingerprint (skip check) ---
  const fpEntries: FingerprintEntry[] = [];
  let canSkip = true;
  for (const collector of collectors) {
    if (typeof collector.getFingerprint === 'function') {
      fpEntries.push({ name: collector.name, stat: await collector.getFingerprint() });
    } else {
      // A collector that can't summarise itself forces a full regenerate every run.
      canSkip = false;
    }
  }
  const fingerprint = buildFingerprint(fpEntries, locales, defaultLocale);

  if (!options.force && canSkip) {
    const meta = await storage.readMeta();
    if (
      meta &&
      !hasChanged(meta.fingerprint, fingerprint) &&
      withinMaxAge(meta.generatedAt, config.maxAge, now()) &&
      (await allPresent(storage, meta.files))
    ) {
      return {
        generated: false,
        files: meta.files,
        fingerprint,
        urlCount: meta.urlCount
      };
    }
  }

  // --- Collect → expand → chunk → render ---
  const children: { name: string; xml: string; lastmod?: string }[] = [];
  let urlCount = 0;
  for (const collector of collectors) {
    const entries = await collector.collect();
    if (entries.length === 0) {
      continue;
    }
    const records = expandLocales(entries, {
      locales,
      defaultLocale,
      baseUrl,
      hreflang: config.hreflang
    });
    for (const part of chunk(records, config.maxUrlsPerFile, collector.name)) {
      children.push({
        name: part.name,
        xml: renderUrlset(part.records),
        lastmod: maxLastmod(part.records)
      });
      urlCount += part.records.length;
    }
  }

  const indexXml = renderIndex(
    children.map((child) => ({ name: child.name, lastmod: child.lastmod })),
    baseUrl
  );
  const files = [
    INDEX_FILE,
    ...children.map((child) => `sitemap-${child.name}.xml`)
  ];

  // Write children first, then the index, then meta — so a crash mid-write never advertises a
  // child that isn't on disk yet.
  await storage.writeFiles([
    ...children.map((child) => ({
      name: `sitemap-${child.name}.xml`,
      content: child.xml
    })),
    { name: INDEX_FILE, content: indexXml }
  ]);
  await storage.writeMeta({
    fingerprint,
    generatedAt: new Date(now()).toISOString(),
    files,
    urlCount
  });
  await storage.pruneOrphans(files);

  return { generated: true, files, fingerprint, urlCount };
}

function withinMaxAge(
  generatedAt: string,
  maxAge: number,
  nowMs: number
): boolean {
  const then = new Date(generatedAt).getTime();
  if (Number.isNaN(then)) {
    return false;
  }
  return nowMs - then < maxAge;
}

async function allPresent(
  storage: SitemapStorage,
  files: string[]
): Promise<boolean> {
  for (const file of files) {
    if (!(await storage.fileExists(file))) {
      return false;
    }
  }
  return true;
}

/** The newest `lastmod` in a chunk (ISO strings sort chronologically), or undefined if none. */
function maxLastmod(records: SitemapUrlRecord[]): string | undefined {
  let max: string | undefined;
  for (const record of records) {
    if (record.lastmod && (max === undefined || record.lastmod > max)) {
      max = record.lastmod;
    }
  }
  return max;
}
