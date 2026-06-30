import { loadAllLocales } from '../../lib/locale/dictionary.js';
import { assertValidHomeUrlEnv } from '../../lib/util/getBaseUrl.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';

export default async () => {
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
};
