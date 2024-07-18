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

  // Set the default file storage to local
  config.util.setModuleDefaults('system', {
    file_storage: 'local'
  });

  // Register default widgets
  const defaultWidgets = {
    hero_banner: {
      setting_component:
        '@evershop/evershop/src/components/frontStore/widgets/Banner.jsx',
      component:
        '@evershop/evershop/src/components/frontStore/widgets/Banner.jsx',
      name: 'Hero Banner',
      description: 'A large banner that appears at the top of your store',
      default_setting: {
        title: 'Welcome to Example.com',
        subtitle: 'The best place to shop online',
        cta: {
          text: 'Shop Now',
          link: '/products'
        },
        image: {
          src: 'https://via.placeholder.com/1920x1080',
          alt: 'Hero Banner'
        }
      },
      enabled: true
    },
    text_block: {
      setting_component:
        '@evershop/evershop/src/components/admin/widgets/TextBlockSetting.jsx',
      component:
        '@evershop/evershop/src/components/frontStore/widgets/TextBlock.jsx',
      name: 'Text block',
      description: 'A large banner that appears at the top of your store',
      default_setting: {
        text: 'Welcome to Example.com',
        subtitle: 'The best place to shop online',
        cta: {
          text: 'Shop Now',
          link: '/products'
        },
        image: {
          src: 'https://via.placeholder.com/1920x1080',
          alt: 'Hero Banner'
        }
      },
      enabled: true
    },
    html_block: {
      setting_component:
        '@evershop/evershop/src/components/admin/widgets/HtmlBlockSetting.jsx',
      component:
        '@evershop/evershop/src/components/frontStore/widgets/HtmlBlock.jsx',
      name: 'Html block',
      description: 'A html block',
      default_setting: {
        html: '',
        css: ''
      },
      enabled: true
    },
    featured_products: {
      setting_component:
        '@evershop/evershop/src/components/frontStore/widgets/FeaturedProducts.jsx',
      component:
        '@evershop/evershop/src/components/frontStore/widgets/FeaturedProducts.jsx',
      name: 'Featured products',
      description: 'A large banner that appears at the top of your store',
      default_setting: {
        title: 'Welcome to Example.com',
        subtitle: 'The best place to shop online',
        cta: {
          text: 'Shop Now',
          link: '/products'
        },
        image: {
          src: 'https://via.placeholder.com/1920x1080',
          alt: 'Hero Banner'
        }
      },
      enabled: true
    }
  };
  config.util.setModuleDefaults('widgets', defaultWidgets);

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
      if (w.id === 'text_block' || w.id === 'html_block') {
        const { settings } = w;
        // Un escape the html of the `text` field
        settings.text = settings.text || '';
        settings.html = settings.html || '';
        settings.text = settings.text.replace(
          /&lt;|&gt;/g,
          (match) => replacements[match]
        );
        settings.html = settings.html.replace(
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
