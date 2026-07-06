import { SITEMAP_CONFIG_DEFAULTS, getSitemapConfig } from '../../config.js';

describe('SITEMAP_CONFIG_DEFAULTS', () => {
  // The constant is the source of truth for "the documented defaults" — independent of the
  // ambient config directory (which a store can override).
  it('documents the expected default values', () => {
    expect(SITEMAP_CONFIG_DEFAULTS.enabled).toBe(true);
    expect(SITEMAP_CONFIG_DEFAULTS.schedule).toBe('*/30 * * * *');
    expect(SITEMAP_CONFIG_DEFAULTS.maxUrlsPerFile).toBe(50000);
    expect(SITEMAP_CONFIG_DEFAULTS.maxAge).toBe(24 * 60 * 60 * 1000);
    expect(SITEMAP_CONFIG_DEFAULTS.hreflang).toBe(true);
    expect(SITEMAP_CONFIG_DEFAULTS.staticPaths).toEqual(['/']);
  });

  it('has sensible per-type changefreq / priority', () => {
    expect(SITEMAP_CONFIG_DEFAULTS.changefreq.product).toBe('daily');
    expect(SITEMAP_CONFIG_DEFAULTS.priority.static).toBe(1.0);
    expect(SITEMAP_CONFIG_DEFAULTS.priority.category).toBe(0.8);
    expect(SITEMAP_CONFIG_DEFAULTS.priority.product).toBe(0.7);
  });

  it('disallows the non-indexable areas in robots by default', () => {
    expect(SITEMAP_CONFIG_DEFAULTS.robots.enabled).toBe(true);
    expect(SITEMAP_CONFIG_DEFAULTS.robots.disallow).toEqual(
      expect.arrayContaining(['/admin/', '/checkout', '/account', '/cart', '/api/'])
    );
  });
});

describe('getSitemapConfig', () => {
  // Reads the ambient config directory with the defaults as fallback, so individual values may be
  // overridden by config/*.json (e.g. a custom `sitemap.schedule`). We assert shape + types, which
  // are robust to any override, rather than exact values.
  it('returns a complete, well-typed config', () => {
    const config = getSitemapConfig();
    expect(typeof config.enabled).toBe('boolean');
    expect(typeof config.schedule).toBe('string');
    expect(typeof config.maxUrlsPerFile).toBe('number');
    expect(typeof config.maxAge).toBe('number');
    expect(typeof config.hreflang).toBe('boolean');
    expect(Array.isArray(config.staticPaths)).toBe(true);
    expect(Object.keys(config.changefreq).sort()).toEqual([
      'category',
      'cmsPage',
      'landingPage',
      'product',
      'static'
    ]);
    expect(Object.keys(config.priority).sort()).toEqual([
      'category',
      'cmsPage',
      'landingPage',
      'product',
      'static'
    ]);
    expect(typeof config.robots.enabled).toBe('boolean');
    expect(Array.isArray(config.robots.disallow)).toBe(true);
  });
});
