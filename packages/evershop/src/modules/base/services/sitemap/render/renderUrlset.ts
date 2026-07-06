import { SitemapUrlRecord } from '../types.js';
import { escapeXml } from './escapeXml.js';

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * Serialize already-absolute `SitemapUrlRecord`s into a `<urlset>` document (sitemaps.org
 * 0.9). The `xmlns:xhtml` namespace is declared ONLY when at least one record carries
 * hreflang alternates, so single-language sitemaps stay namespace-free. Absolutization and
 * locale prefixing happened upstream in `expandLocales` — this function is a pure serializer.
 */
export function renderUrlset(records: SitemapUrlRecord[]): string {
  const hasAlternates = records.some(
    (record) => record.alternates && record.alternates.length > 0
  );
  const open = hasAlternates
    ? `<urlset xmlns="${SITEMAP_NS}" xmlns:xhtml="${XHTML_NS}">`
    : `<urlset xmlns="${SITEMAP_NS}">`;
  const body = records.map(renderUrl).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${open}\n${body}${
    body ? '\n' : ''
  }</urlset>\n`;
}

function renderUrl(record: SitemapUrlRecord): string {
  const lines = [`    <loc>${escapeXml(record.loc)}</loc>`];
  if (record.lastmod) {
    lines.push(`    <lastmod>${escapeXml(record.lastmod)}</lastmod>`);
  }
  if (record.changefreq) {
    lines.push(`    <changefreq>${escapeXml(record.changefreq)}</changefreq>`);
  }
  if (record.priority !== undefined) {
    lines.push(`    <priority>${formatPriority(record.priority)}</priority>`);
  }
  if (record.alternates) {
    for (const alt of record.alternates) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(
          alt.hreflang
        )}" href="${escapeXml(alt.href)}"/>`
      );
    }
  }
  return `  <url>\n${lines.join('\n')}\n  </url>`;
}

/** Clamp to [0,1] and render with one decimal (sitemap priority precision). */
function formatPriority(priority: number): string {
  const clamped = Math.max(0, Math.min(1, priority));
  return clamped.toFixed(1);
}
