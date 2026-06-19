import { loadAllLocales } from '../../lib/locale/dictionary.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';

export default async () => {
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
            weightUnit: {
              type: 'string'
            },
            currency: {
              type: 'string'
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
