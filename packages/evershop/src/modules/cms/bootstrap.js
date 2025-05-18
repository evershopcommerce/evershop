import path from 'path';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerDefaultPageCollectionFilters } from '../../modules/cms/services/registerDefaultPageCollectionFilters.js';
import { registerDefaultWidgetCollectionFilters } from '../../modules/cms/services/registerDefaultWidgetCollectionFilters.js';

export default () => {
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
        },
        widgets: {
          type: 'object',
          patternProperties: {
            '^[a-zA-Z_]+$': {
              type: 'object',
              properties: {
                setting_component: {
                  type: 'string'
                },
                component: {
                  type: 'string'
                },
                name: {
                  type: 'string'
                },
                description: {
                  type: 'string'
                },
                default_settings: {
                  type: 'object'
                },
                enabled: {
                  type: 'boolean'
                }
              },
              required: [
                'setting_component',
                'component',
                'name',
                'description',
                'enabled'
              ],
              additionalProperties: false
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
    text_block: {
      setting_component: path.resolve(
        CONSTANTS.LIBPATH,
        '../components/admin/widgets/TextBlockSetting.jsx'
      ),
      component: path.resolve(
        CONSTANTS.LIBPATH,
        '../components/frontStore/widgets/TextBlock.jsx'
      ),
      name: 'Text block',
      description: 'A text block widget',
      default_settings: {
        className: 'page-width'
      },
      enabled: true
    },
    basic_menu: {
      setting_component: path.resolve(
        CONSTANTS.LIBPATH,
        '../components/admin/widgets/BasicMenuSetting.jsx'
      ),
      component: path.resolve(
        CONSTANTS.LIBPATH,
        '../components/frontStore/widgets/BasicMenu.jsx'
      ),
      name: 'Menu',
      description: 'A menu widget',
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

  const parseMenus = (data) => {
    if (data?.type !== 'basic_menu') {
      return data;
    }

    data.settings = data.settings || {};
    if (data.settings.menus) {
      data.settings.menus = JSON.parse(data.settings.menus);
    } else {
      data.settings.menus = [];
    }
    return data;
  };

  addProcessor('widgetDataBeforeCreate', parseMenus, 1);
  addProcessor('widgetDataBeforeUpdate', parseMenus, 1);
};
