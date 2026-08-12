import config from 'config';
import { SitemapChangeFreq } from './types.js';

/**
 * Resolved sitemap configuration. Read from node-config under the `sitemap` namespace with the
 * defaults below as fallback, so it works identically before and after P5 registers the module
 * defaults (`config.util.setModuleDefaults('sitemap', …)`) — a cold config (unit test, fresh
 * install) yields exactly these defaults. Read via the raw `config` package (not the typed
 * `getConfig`) until the `sitemap` key is added to `ConfigStructure` in P5.
 */
export interface SitemapConfig {
  enabled: boolean;
  schedule: string;
  maxUrlsPerFile: number;
  /** ms; force a full regenerate when the last one is older than this, regardless of fingerprint. */
  maxAge: number;
  hreflang: boolean;
  staticPaths: string[];
  changefreq: {
    product: SitemapChangeFreq;
    category: SitemapChangeFreq;
    cmsPage: SitemapChangeFreq;
    landingPage: SitemapChangeFreq;
    static: SitemapChangeFreq;
  };
  priority: {
    product: number;
    category: number;
    cmsPage: number;
    landingPage: number;
    static: number;
  };
  robots: { enabled: boolean; disallow: string[] };
}

export const SITEMAP_CONFIG_DEFAULTS: SitemapConfig = {
  enabled: true,
  schedule: '*/30 * * * *',
  maxUrlsPerFile: 50000,
  maxAge: 24 * 60 * 60 * 1000,
  hreflang: true,
  staticPaths: ['/'],
  changefreq: {
    product: 'daily',
    category: 'daily',
    cmsPage: 'weekly',
    landingPage: 'weekly',
    static: 'daily'
  },
  priority: {
    product: 0.7,
    category: 0.8,
    cmsPage: 0.5,
    landingPage: 0.6,
    static: 1.0
  },
  robots: {
    enabled: true,
    disallow: ['/admin/', '/checkout', '/account', '/cart', '/api/']
  }
};

function read<T>(key: string, fallback: T): T {
  return config.has(key) ? (config.get(key) as T) : fallback;
}

/** Resolve the effective sitemap config (defaults merged with any `sitemap.*` overrides). */
export function getSitemapConfig(): SitemapConfig {
  const d = SITEMAP_CONFIG_DEFAULTS;
  return {
    enabled: read('sitemap.enabled', d.enabled),
    schedule: read('sitemap.schedule', d.schedule),
    maxUrlsPerFile: read('sitemap.maxUrlsPerFile', d.maxUrlsPerFile),
    maxAge: read('sitemap.maxAge', d.maxAge),
    hreflang: read('sitemap.hreflang', d.hreflang),
    staticPaths: read('sitemap.staticPaths', d.staticPaths),
    changefreq: { ...d.changefreq, ...read('sitemap.changefreq', {}) },
    priority: { ...d.priority, ...read('sitemap.priority', {}) },
    robots: { ...d.robots, ...read('sitemap.robots', {}) }
  };
}
