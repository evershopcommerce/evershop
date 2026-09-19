export interface RobotsTxtOptions {
  /** Absolute URL of the sitemap index, e.g. `https://shop.com/sitemap.xml`. */
  sitemapUrl: string;
  /** Paths to disallow, e.g. `['/admin/', '/checkout', '/account', '/cart', '/api/']`. */
  disallow: string[];
  /**
   * Whether to advertise the sitemap. Defaults to true. Set false when sitemap generation is
   * disabled so robots.txt doesn't point at a `Sitemap:` that won't resolve.
   */
  includeSitemap?: boolean;
}

/**
 * Render a default robots.txt. Served dynamically only when no physical `public/robots.txt`
 * exists (that file, if present, wins). The `Sitemap:` directive carries an ABSOLUTE URL —
 * a static file can't know the per-install origin, which is why robots.txt is dynamic.
 */
export function renderRobotsTxt(options: RobotsTxtOptions): string {
  const includeSitemap = options.includeSitemap !== false;
  const lines = ['User-agent: *'];
  if (options.disallow.length === 0) {
    lines.push('Disallow:');
  } else {
    for (const path of options.disallow) {
      lines.push(`Disallow: ${path}`);
    }
  }
  if (includeSitemap && options.sitemapUrl) {
    lines.push('');
    lines.push(`Sitemap: ${options.sitemapUrl}`);
  }
  return `${lines.join('\n')}\n`;
}
