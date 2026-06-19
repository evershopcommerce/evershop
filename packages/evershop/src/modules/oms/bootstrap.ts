import config from 'config';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { merge } from '../../lib/util/merge.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerCarrier } from './services/carrier/registry.js';
import registerDefaultOrderCollectionFilters from './services/registerDefaultOrderCollectionFilters.js';
import {
  changeOrderStatus,
  resolveOrderStatus
} from './services/updateOrderStatus.js';

export default () => {
  addProcessor('configurationSchema', (schema) => {
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
                        phase: {
                          type: 'string',
                          enum: ['pending', 'shipped', 'delivered', 'canceled']
                        }
                        // No `isDefault` (the default status is decided by
                        // createShipment, not by a per-status flag) and no
                        // `isCancelable` (cancelability is now driven by
                        // the `shipmentRollupCancelable` map keyed on the
                        // order-level rollup value).
                      },
                      required: ['name', 'badge', 'phase']
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
                        isDefault: {
                          type: 'boolean'
                        },
                        isCancelable: {
                          type: 'boolean'
                        }
                      },
                      required: ['name', 'badge']
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
                      required: ['name', 'badge']
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge']
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge']
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge']
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
                        next: {
                          type: 'array',
                          items: {
                            type: 'string'
                          }
                        }
                      },
                      required: ['name', 'badge']
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
                shipmentRollup: {
                  type: 'object',
                  patternProperties: {
                    '^(all|any):(pending|shipped|delivered|canceled)$': {
                      type: 'string',
                      enum: [
                        'pending',
                        'partially_shipped',
                        'shipped',
                        'partially_delivered',
                        'delivered',
                        'partially_canceled',
                        'canceled'
                      ]
                    }
                  },
                  additionalProperties: false
                },
                shipmentRollupCancelable: {
                  type: 'object',
                  properties: {
                    pending: { type: 'boolean' },
                    partially_shipped: { type: 'boolean' },
                    shipped: { type: 'boolean' },
                    partially_delivered: { type: 'boolean' },
                    delivered: { type: 'boolean' },
                    partially_canceled: { type: 'boolean' },
                    canceled: { type: 'boolean' }
                  },
                  additionalProperties: false
                },
                reStockAfterCancellation: {
                  type: 'boolean'
                }
              },
              required: ['shipmentStatus', 'paymentStatus'],
              additionalProperties: false
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
      // Default shipment statuses. No `pending` or `processing` — every
      // shipment row exists because something was actually shipped (stock
      // is deducted at order placement, so there's no pre-shipped
      // reservation to model). The `pending` ROLLUP value still exists at
      // the order level ("no items shipped yet"), but no per-shipment row
      // uses the `pending` phase.
      //
      // Cancelability is now a rollup-level config (`shipmentRollupCancelable`
      // below), not a per-status flag — see the §3 design notes. Extensions
      // can still register custom shipment statuses, but they MUST pick a
      // phase from `shipped | delivered | canceled` for the merchant-visible
      // lifecycle to behave consistently.
      shipmentStatus: {
        shipped: {
          name: 'Shipped',
          badge: 'warning',
          phase: 'shipped'
        },
        delivered: {
          name: 'Delivered',
          badge: 'success',
          phase: 'delivered'
        },
        canceled: {
          name: 'Canceled',
          badge: 'destructive',
          phase: 'canceled'
        }
      },
      paymentStatus: {
        pending: {
          name: 'Pending',
          badge: 'default',
          isDefault: true,
          isCancelable: true
        },
        paid: {
          name: 'Paid',
          badge: 'success',
          isCancelable: false
        },
        canceled: {
          name: 'Canceled',
          badge: 'destructive',
          isCancelable: true
        }
      },
      status: {
        new: {
          name: 'New',
          badge: 'default',
          isDefault: true,
          next: ['processing', 'canceled']
        },
        processing: {
          name: 'Processing',
          badge: 'default',
          next: ['completed', 'canceled']
        },
        completed: {
          name: 'Completed',
          badge: 'success',
          next: ['closed']
        },
        canceled: {
          name: 'Canceled',
          badge: 'destructive',
          next: []
        },
        closed: {
          name: 'Closed',
          badge: 'outline',
          next: []
        }
      },
      psoMapping: {
        'pending:pending': 'new',
        'pending:*': 'processing',
        'paid:pending': 'processing',
        'paid:partially_shipped': 'processing',
        'paid:shipped': 'processing',
        'paid:partially_delivered': 'processing',
        'paid:delivered': 'completed',
        // Shipment-side cancellation no longer cancels the ORDER: canceling
        // every shipment leaves the order in `processing` so the merchant can
        // re-ship or cancel deliberately. PAYMENT-side cancellation
        // (`canceled:*`, driven by cancelOrder) is what actually cancels the
        // order. `canceled:canceled` is explicit because resolveOrderStatus
        // checks exact keys before `*:ship` — without it, `*:canceled` →
        // processing would shadow `canceled:*` when cancelOrder cancels the
        // shipments after the payment, and the no-revert guard would throw.
        '*:partially_canceled': 'processing',
        '*:canceled': 'processing',
        'canceled:canceled': 'canceled',
        'canceled:*': 'canceled'
      },
      // Predicate → rollup output. The resolver walks these in priority order
      // (all:delivered → any:delivered → all:shipped → any:shipped →
      // all:canceled → any:canceled → all:pending) and returns the first
      // match. The canceled rules sit after shipped/delivered (shipping
      // progress wins) but before all:pending — canceled items count zero
      // toward shipped/delivered, so a canceled order also satisfies
      // all:pending and would be masked otherwise. See
      // wiki/multi-shipment-design.md → "Item-based rollup math".
      shipmentRollup: {
        'all:delivered': 'delivered',
        'any:delivered': 'partially_delivered',
        'all:shipped': 'shipped',
        'any:shipped': 'partially_shipped',
        'all:canceled': 'canceled',
        'any:canceled': 'partially_canceled',
        'all:pending': 'pending'
      },
      // Per-rollup-value cancelability. Keys are the six possible outputs of
      // the order-level shipment-status rollup (`pending` / `partially_shipped`
      // / `shipped` / `partially_delivered` / `delivered` / `canceled`). The
      // two policy knobs merchants actually want to vary are `shipped` and
      // `partially_delivered`: "can the order still be canceled once it's
      // physically in transit?" Defaults err on the side of allowing
      // cancellation; tighten via `addProcessor('shipmentRollupCancelable',
      // ...)` if the merchant's carrier policy says otherwise.
      shipmentRollupCancelable: {
        pending: true,
        partially_shipped: true,
        shipped: true,
        partially_delivered: true,
        delivered: false,
        // Canceling shipments now KEEPS the order in `processing`, so these
        // rollup states must stay cancelable — otherwise the merchant could
        // neither re-ship nor cancel an order whose shipments are all gone.
        partially_canceled: true,
        canceled: true
      },
      reStockAfterCancellation: true
    }
  };
  config.util.setModuleDefaults('oms', defaultOrderConfig);

  // Reigtering the default filters for attribute collection
  addProcessor(
    'orderCollectionFilters',
    registerDefaultOrderCollectionFilters,
    1
  );
  addProcessor<Array<any>>(
    'orderCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  hookAfter(
    'changePaymentStatus',
    async (order, orderId, status, connection) => {
      const newOrderStatus = resolveOrderStatus(status, order.shipment_status);
      if (order.status === 'canceled' && newOrderStatus !== 'canceled') {
        throw new Error('Order is already canceled');
      }
      if (order.status === 'closed' && newOrderStatus !== 'closed') {
        throw new Error('Order is already closed');
      }
      await changeOrderStatus(orderId, newOrderStatus, connection);
    }
  );

  hookAfter(
    'changeShipmentStatus',
    async (order, orderId, status, connection) => {
      const newOrderStatus = resolveOrderStatus(order.payment_status, status);
      if (order.status === 'canceled' && newOrderStatus !== 'canceled') {
        throw new Error('Order is already canceled');
      }
      if (order.status === 'closed' && newOrderStatus !== 'closed') {
        throw new Error('Order is already closed');
      }

      await changeOrderStatus(orderId, newOrderStatus, connection);
    }
  );

  /**
   * Built-in "Custom / Other" carrier. Pure metadata — no `createLabel`,
   * `voidLabel`, `generateTrackingUrl`, `fetchStatus`, or `schedulePickup`
   * methods. This isn't a real carrier integration; it's the fallback an
   * admin picks when shipping via a carrier with no API integration (a
   * local courier, an obscure regional carrier, etc.).
   *
   * Without this entry the carrier dropdown is empty out of the box and
   * admins can't create shipments at all unless they install a carrier
   * extension first. With it, the dropdown always has at least one option
   * and the create flow works without any extension.
   *
   * Capability-gated UI behavior:
   *   - Tracking number input is hidden in the create-shipment modal and
   *     in the inline edit-tracking form when this carrier is selected
   *     (no method consumes the tracking number, so prompting for one is
   *     misleading).
   *   - The "Track →" link, "Print Label" button, and "Void Label" button
   *     on the per-shipment row never appear (they're gated on the
   *     corresponding capabilities, which this carrier lacks).
   *   - The customer email's "Track shipment →" CTA degrades to plain
   *     "Carrier: Custom / Other" text.
   *
   * Note: this registration could equally live in an extension. It's
   * registered in core so the out-of-box experience works. Shops that
   * install a real carrier extension can simply ignore this entry — the
   * registry permits unlimited carriers.
   */
  registerCarrier({
    code: 'custom',
    name: 'Custom / Other',
    description:
      'Generic fallback for shipping without a specific carrier integration.'
  });

  // Multi-shipment refactor A3: the previous `createShipmentForVirtualProductsOrder`
  // hook is gone. For all-digital orders the rollup short-circuits to
  // `'delivered'` and orderCreator writes that as the initial `shipment_status`
  // directly — no need to fabricate a shipment row to drive the math. Pre-migration
  // digital orders keep their vestigial shipment row as historical record.
};
