const config = require('config');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const registerDefaultPageCollectionFilters = require('./services/registerDefaultPageCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const { addProcessor } = require('../../lib/util/registry');
const registerDefaultWidgetCollectionFilters = require('./services/registerDefaultWidgetCollectionFilters');

module.exports = () => {
  addProcessor('configuratonSchema', (schema) => {
    merge(schema, {
      properties: {
        themeConfig: {
          type: 'object',
          properties: {
            logo: {
              type: 'object',
              properties: {
                alt: {
                  type: 'string'
                },
                src: {
                  type: 'string',
                  format: 'uri-reference'
                },
                width: {
                  type: 'integer'
                },
                height: {
                  type: 'integer'
                }
              }
            },
            headTags: {
              type: 'object',
              properties: {
                links: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rel: {
                        type: 'string'
                      },
                      href: {
                        type: 'string',
                        format: 'uri-reference'
                      }
                    },
                    required: ['rel', 'href']
                  }
                },
                metas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      content: {
                        type: 'string'
                      }
                    },
                    required: ['name', 'content']
                  }
                },
                scripts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      src: {
                        type: 'string',
                        format: 'uri-reference'
                      },
                      type: {
                        type: 'string'
                      },
                      async: {
                        type: 'boolean'
                      },
                      defer: {
                        type: 'boolean'
                      },
                      crossorigin: {
                        type: 'string'
                      },
                      integrity: {
                        type: 'string'
                      },
                      noModule: {
                        type: 'string'
                      },
                      nonce: {
                        type: 'string'
                      }
                    },
                    required: ['src']
                  }
                },
                bases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      href: {
                        type: 'string',
                        format: 'uri-reference'
                      }
                    },
                    required: ['href']
                  }
                }
              }
            }
          }
        },
        system: {
          type: 'object',
          properties: {
            file_storage: {
              type: 'string',
              enum: ['local']
            }
          }
        }
      }
    });
    return schema;
  });

  const defaultThemeConfig = {
    logo: {
      alt: undefined,
      src: undefined,
      width: undefined,
      height: undefined
    },
    headTags: {
      links: [],
      metas: [],
      scripts: [],
      bases: []
    },
    copyRight: `© 2022 Evershop. All Rights Reserved.`
  };
  config.util.setModuleDefaults('themeConfig', defaultThemeConfig);
  config.util.setModuleDefaults('system', {
    file_storage: 'local'
  });

  // Reigtering the default filters for cms page collection
  addProcessor(
    'cmsPageCollectionFilters',
    registerDefaultPageCollectionFilters,
    1
  );
  addProcessor(
    'cmsPageCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // Reigtering the default filters for widget collection
  addProcessor(
    'widgetCollectionFilters',
    registerDefaultWidgetCollectionFilters,
    1
  );
  addProcessor(
    'widgetCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor('widgets', (widgets) =>
    widgets.map((w) => {
      const replacements = {
        '&lt;': '<',
        '&gt;': '>'
      };
      if (w.id === 'text_block') {
        const { settings } = w;
        // Un escape the html of the `text` field
        settings.text = settings.text || '';
        settings.text = settings.text.replace(
          /&lt;|&gt;/g,
          (match) => replacements[match]
        );
        return {
          ...w,
          props: settings
        };
      } else {
        return w;
      }
    })
  );
};
