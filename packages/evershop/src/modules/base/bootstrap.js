import path from 'path';
import config from 'config';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { loadAllLocales } from '../../lib/locale/dictionary.js';
import { loadThemeMetafieldProjection } from '../../lib/metafield/projection.js';
import { assertValidHomeUrlEnv } from '../../lib/util/getBaseUrl.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { getBuiltinSitemapCollectors } from './services/sitemap/collectors/builtins.js';
import { SITEMAP_CONFIG_DEFAULTS, getSitemapConfig } from './services/sitemap/config.js';
import { registerSitemapCollector } from './services/sitemap/registry.js';

export default async () => {
  // Manifest-descriptor projection for the storefront <Metafield> component
  // (theme-metafields design). Precomputed once — the appConfig seam is
  // getValueSync, which rejects async processors — and merged into
  // eContext.config on every render (both the full-render and ajax builders
  // consume 'appConfig', so one registration covers both). `function`
  // keyword on the processor: registry invokes callback.call(context, value).
  const themeMetafieldDescriptors = loadThemeMetafieldProjection();
  addProcessor('appConfig', function addThemeMetafieldDescriptors(appConfig) {
    return { ...appConfig, themeMetafieldDescriptors };
  });
  // Fail fast if EVERSHOP_HOME_URL is set to something that isn't a valid
  // http(s) URL. Throwing here halts boot (build/dev/start all wrap bootstrap
  // in a try/catch that exits), before any broken absolute URL can be emitted.
  assertValidHomeUrlEnv();
  // Build the runtime locale registry from disk (spec §6.2/§6.3). `translate()` and
  // `_()` now read this registry / the per-request ALS context — no separate loadCsv.
  await loadAllLocales();
  addProcessor('configurationSchema', (schema) => {
    merge(schema, {
      properties: {
        shop: {
          type: 'object',
          properties: {
            homeUrl: {
              type: 'string',
              format: 'uri'
            },
            language: {
              type: 'string'
            },
            timezone: {
              type: 'string'
            }
          }
        },
        system: {
          type: 'object',
          properties: {
            extensions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string'
                  },
                  resolve: {
                    type: 'string'
                  },
                  enabled: {
                    type: 'boolean'
                  },
                  priority: {
                    type: 'number'
                  }
                },
                required: ['name', 'enabled', 'resolve']
              }
            },
            theme: {
              type: 'string',
              required: ['name']
            },
            session: {
              type: 'object',
              properties: {
                cookieSecret: {
                  type: 'string'
                },
                cookieName: {
                  type: 'string'
                },
                maxAge: {
                  type: 'number'
                },
                reSave: {
                  type: 'boolean'
                },
                saveUninitialized: {
                  type: 'boolean'
                }
              }
            }
          }
        }
      }
    });
    return schema;
  });

  // --- Sitemap (wiki/sitemap-design.md) ---
  // Config defaults, a validation-schema slice, the built-in URL collectors, and the
  // regeneration cron. Registered here (before the bootstrap lock) so the registry has the
  // collectors and the cron child has the job.
  config.util.setModuleDefaults('sitemap', SITEMAP_CONFIG_DEFAULTS);
  addProcessor('configurationSchema', (schema) => {
    merge(schema, {
      properties: {
        sitemap: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            schedule: { type: 'string' },
            maxUrlsPerFile: { type: 'number' },
            maxAge: { type: 'number' },
            hreflang: { type: 'boolean' },
            staticPaths: { type: 'array', items: { type: 'string' } },
            changefreq: { type: 'object' },
            priority: { type: 'object' },
            robots: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                disallow: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });
    return schema;
  });
  getBuiltinSitemapCollectors().forEach(registerSitemapCollector);
  const sitemapConfig = getSitemapConfig();
  registerJob({
    name: 'generateSitemap',
    schedule: sitemapConfig.schedule,
    resolve: path.resolve(
      import.meta.dirname,
      'services',
      'sitemap',
      'generateSitemapJob.js'
    ),
    enabled: sitemapConfig.enabled
  });
};
