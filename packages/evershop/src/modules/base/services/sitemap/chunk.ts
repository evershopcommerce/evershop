import { SitemapUrlRecord } from './types.js';

/** A chunk of a collector's URLs destined for one child file, `sitemap-<name>.xml`. */
export interface SitemapChunk {
  name: string;
  records: SitemapUrlRecord[];
}

/**
 * Split a collector's POST-EXPANSION records into child sitemaps of at most `max` URLs each
 * (Google's cap: 50,000 URLs / 50 MB per file). The first chunk keeps the base name; overflow
 * chunks get `-2`, `-3`, … (`products`, `products-2`, …). Zero records ⇒ no chunk (the collector
 * contributes no child and no index entry).
 */
export function chunk(
  records: SitemapUrlRecord[],
  max: number,
  baseName: string
): SitemapChunk[] {
  if (records.length === 0) {
    return [];
  }
  const size = max > 0 ? max : records.length;
  const chunks: SitemapChunk[] = [];
  for (let offset = 0; offset < records.length; offset += size) {
    const index = offset / size;
    const name = index === 0 ? baseName : `${baseName}-${index + 1}`;
    chunks.push({ name, records: records.slice(offset, offset + size) });
  }
  return chunks;
}
