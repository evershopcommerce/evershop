import { escapeXml } from './escapeXml.js';

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/** A child sitemap referenced by the index. `name` is the child basename (`sitemap-<name>.xml`). */
export interface SitemapIndexChild {
  name: string;
  lastmod?: string;
}

/**
 * Serialize a `<sitemapindex>` document. Child `<loc>`s are fully-qualified root-level URLs
 * (`${baseUrl}/sitemap-<name>.xml`) — every sitemap file lives at the site root so Google's
 * directory-scope rule doesn't restrict which URLs a child may list (wiki/sitemap-design.md §12/C4).
 */
export function renderIndex(
  children: SitemapIndexChild[],
  baseUrl: string
): string {
  const body = children
    .map((child) => renderChild(child, baseUrl))
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${SITEMAP_NS}">\n${body}${
    body ? '\n' : ''
  }</sitemapindex>\n`;
}

function renderChild(child: SitemapIndexChild, baseUrl: string): string {
  const loc = `${baseUrl}/sitemap-${child.name}.xml`;
  const lines = [`    <loc>${escapeXml(loc)}</loc>`];
  if (child.lastmod) {
    lines.push(`    <lastmod>${escapeXml(child.lastmod)}</lastmod>`);
  }
  return `  <sitemap>\n${lines.join('\n')}\n  </sitemap>`;
}
