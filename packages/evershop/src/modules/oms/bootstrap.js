const config = require('config');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const registerDefaultOrderCollectionFilters = require('./services/registerDefaultOrderCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const { addProcessor } = require('../../lib/util/registry');

module.exports = () => {
  addProcessor('configuratonSchema', (schema) => {
    merge(schema, {
      properties: {
        oms: {
          type: 'object',
          properties: {
            order: {
              type: 'object',
              properties: {
                shipmentStatus: {
                  type: 'object',
                  patternProperties: {
                    '^[a-zA-Z_]+$': {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        badge: {
                          type: 'string'
                        },
                        progress: {
                          type: 'string'
                        },
                        isDefault: {
                          type: 'boolean'
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    }
                  },
                  additionalProperties: false
                },
                paymentStatus: {
                  type: 'object',
                  patternProperties: {
                    '^[a-zA-Z_]+$': {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        badge: {
                          type: 'string'
                        },
                        progress: {
                          type: 'string'
                        },
                        isDefault: {
                          type: 'boolean'
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    }
                  },
                  additionalProperties: false
                }
              },
              required: ['shipmentStatus', 'paymentStatus'],
              additionalProperties: false
            },
            carriers: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string'
                  },
                  trackingUrl: {
                    type: 'string'
                  }
                },
                required: ['name']
              }
            }
          }
        }
      }
    });
    return schema;
  });

  // Default order configuration
  const defaultOrderConfig = {
    order: {
      shipmentStatus: {
        processing: {
          name: 'Processing',
          badge: 'default',
          progress: 'incomplete',
          isDefault: true
        },
        shipped: {
          name: 'Shipped',
          badge: 'attention',
          progress: 'complete'
        },
        delivered: {
          name: 'Delivered',
          badge: 'success',
          progress: 'complete'
        }
      },
      paymentStatus: {
        pending: {
          name: 'Pending',
          badge: 'default',
          progress: 'incomplete',
          isDefault: true
        },
        paid: {
          name: 'Paid',
          badge: 'success',
          progress: 'complete'
        }
      }
    },
    carriers: {
      default: {
        name: 'Default'
      },
      fedex: {
        name: 'FedEx',
        trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}'
      },
      usps: {
        name: 'USPS',
        trackingUrl:
          'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={trackingNumber}'
      },
      ups: {
        name: 'UPS',
        trackingUrl:
          'https://www.ups.com/track?loc=en_US&tracknum={trackingNumber}'
      }
    }
  };
  config.util.setModuleDefaults('oms', defaultOrderConfig);

  // Reigtering the default filters for attribute collection
  addProcessor(
    'orderCollectionFilters',
    registerDefaultOrderCollectionFilters,
    1
  );
  addProcessor(
    'orderCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );
};
