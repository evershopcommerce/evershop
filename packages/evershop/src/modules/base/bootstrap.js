const {
  loadCsv
} = require('@evershop/evershop/src/lib/locale/translate/translate');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const { addProcessor } = require('../../lib/util/registry');

module.exports = async () => {
  await loadCsv();
  addProcessor('configuratonSchema', (schema) => {
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
            jobs: {
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
                  schedule: {
                    type: 'string'
                  }
                },
                required: ['name', 'enabled', 'resolve', 'schedule']
              }
            },
            theme: {
              type: 'string'
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
