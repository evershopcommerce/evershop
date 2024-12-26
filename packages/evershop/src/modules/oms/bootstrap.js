const config = require('config');
const { merge } = require('@evershop/evershop/src/lib/util/merge');
const registerDefaultOrderCollectionFilters = require('./services/registerDefaultOrderCollectionFilters');
const {
  defaultPaginationFilters
} = require('../../lib/util/defaultPaginationFilters');
const { addProcessor } = require('../../lib/util/registry');
const { hookAfter } = require('../../lib/util/hookable');
const {
  changeOrderStatus,
  resolveOrderStatus
} = require('./services/updateOrderStatus');

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
                        },
                        isCancelable: {
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
                        },
                        isCancelable: {
                          type: 'boolean'
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    }
                  },
                  additionalProperties: false
                },
                status: {
                  type: 'object',
                  properties: {
                    new: {
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
                        },
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    },
                    processing: {
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    },
                    completed: {
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    },
                    canceled: {
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    },
                    closed: {
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge', 'progress']
                    }
                  },
                  additionalProperties: true
                },
                psoMapping: {
                  type: 'object',
                  patternProperties: {
                    '^[a-zA-Z_*]+:[a-zA-Z_*]+$': {
                      type: 'string'
                    }
                  },
                  additionalProperties: false
                },
                reStockAfterCancellation: {
                  type: 'boolean'
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
        pending: {
          name: 'Pending',
          badge: 'default',
          progress: 'incomplete',
          isDefault: true
        },
        processing: {
          name: 'Processing',
          badge: 'default',
          progress: 'incomplete',
          isDefault: false
        },
        shipped: {
          name: 'Shipped',
          badge: 'attention',
          progress: 'complete'
        },
        delivered: {
          name: 'Delivered',
          badge: 'success',
          progress: 'complete',
          isCancelable: false
        },
        canceled: {
          name: 'Canceled',
          badge: 'critical',
          progress: 'complete',
          isCancelable: false
        }
      },
      paymentStatus: {
        pending: {
          name: 'Pending',
          badge: 'default',
          progress: 'incomplete',
          isDefault: true,
          isCancelable: true
        },
        paid: {
          name: 'Paid',
          badge: 'success',
          progress: 'complete',
          isCancelable: false
        },
        canceled: {
          name: 'Canceled',
          badge: 'critical',
          progress: 'complete',
          isCancelable: true
        }
      },
      status: {
        new: {
          name: 'New',
          badge: 'default',
          progress: 'incomplete',
          isDefault: true,
          next: ['processing', 'canceled']
        },
        processing: {
          name: 'Processing',
          badge: 'default',
          progress: 'incomplete',
          next: ['completed', 'canceled']
        },
        completed: {
          name: 'Completed',
          badge: 'success',
          progress: 'complete',
          next: ['closed']
        },
        canceled: {
          name: 'Canceled',
          badge: 'critical',
          progress: 'complete',
          next: []
        },
        closed: {
          name: 'Closed',
          badge: 'default',
          progress: 'complete',
          next: []
        }
      },
      psoMapping: {
        'pending:pending': 'new',
        'pending:*': 'processing',
        'paid:*': 'processing',
        'paid:delivered': 'completed',
        'canceled:*': 'processing',
        'canceled:canceled': 'canceled'
      },
      reStockAfterCancellation: true
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

  hookAfter(
    'changePaymentStatus',
    async (order, orderId, status, connection) => {
      if (order.status === 'canceled') {
        throw new Error('Order is already canceled');
      }
      if (order.status === 'closed') {
        throw new Error('Order is already closed');
      }
      const orderStatus = resolveOrderStatus(status, order.shipment_status);
      await changeOrderStatus(order, orderStatus, connection);
    }
  );

  hookAfter(
    'changeShipmentStatus',
    async (order, orderId, status, connection) => {
      if (order.status === 'canceled') {
        throw new Error('Order is already canceled');
      }
      if (order.status === 'closed') {
        throw new Error('Order is already closed');
      }
      const orderStatus = resolveOrderStatus(order.payment_status, status);
      await changeOrderStatus(order, orderStatus, connection);
    }
  );
};
