import {
  CategoryRow,
  CustomerRow,
  OrderRow,
  ProductImageRow,
  ProductInventoryRow,
  ProductRow
} from './db/index.js';
/**
 * Event registry that maps event names to their data types.
 * Extend this interface in your modules to register custom events.
 *
 * @example
 * ```typescript
 * // In your module
 * declare module '@evershop/evershop/types/event' {
 *   interface EventDataRegistry {
 *     'order_placed': {
 *       orderId: number;
 *       customerId: number;
 *       total: number;
 *       items: Array<{ productId: number; quantity: number }>;
 *     };
 *     'customer_registered': {
 *       customerId: number;
 *       email: string;
 *       name: string;
 *     };
 *   }
 * }
 * ```
 */
export interface EventDataRegistry {
  /**
   * Fired when a new product is created
   * Data: Complete product table row
   */
  product_created: ProductRow;

  /**
   * Fired when a product is updated
   * Data: Complete product table row
   */
  product_updated: ProductRow;

  /**
   * Fired when a product is deleted
   * Data: Complete product table row
   */
  product_deleted: ProductRow;

  /**
   * Fired when a product image is added
   * Data: Complete product_image table row
   */
  product_image_added: ProductImageRow;

  /**
   * Fired when a new category is created
   * Data: Complete category table row
   */
  category_created: CategoryRow;

  /**
   * Fired when a category is updated
   * Data: Complete category table row
   */
  category_updated: CategoryRow;
  /**
   * Fired when a category is deleted
   * Data: Complete category table row
   */
  category_deleted: CategoryRow;

  /**
   * Fired when product inventory is updated
   * Data: Complete product_inventory table row
   */
  inventory_updated: {
    old: ProductInventoryRow;
    new: ProductInventoryRow;
  };

  /**
   * Fired when a new customer is registered and status = 1 (account is active)
   * Data: Complete customer table row
   */
  customer_registered: CustomerRow;

  /**
   * Fired when a new customer record is added to database, regardless of the status value
   * Data: Complete customer table row
   */
  customer_created: CustomerRow;

  /**
   * Fired when a customer record in database is updated
   * Data: Complete customer table row
   */
  customer_updated: CustomerRow;

  /**
   * Fired when a customer record is deleted
   * Data: Complete customer table row
   */
  customer_deleted: CustomerRow;

  /**
   * Fired when a new order record is created in database, regardless of the payment method or order status
   * Data: Complete order table row
   */
  order_created: OrderRow;

  /**
   * Fired when a new order is placed
   * (This means the order is created and the payment is successful (decided by the payment method, for example, for cod, the order is created when the order is placed, but for online payment, the order is created when the payment is successful))
   */
  order_placed: OrderRow;

  /**
   * Fired when an order status is updated.
   * Data: {
   *   orderId: number;
   *   before: string; // the previous order status
   *   after: string; // the new order status
   * }
   */
  order_status_updated: {
    orderId: number;
    before: string;
    after: string;
  };

  /**
   * Fired after a shipment row has been inserted by `createShipment` and the
   * order rollup has been recomputed. The transaction is already committed.
   * Subscribers (lifecycle emails, webhook bridges) consume this.
   * `notifyCustomer` reflects the admin's checkbox at creation time —
   * subscribers must short-circuit when false.
   */
  shipment_created: {
    shipmentId: number;
    orderId: number;
    notifyCustomer: boolean;
  };

  /**
   * Fired when a shipment transitions to a status whose phase is `delivered`.
   * Cross-checked against the registry's `phase` field. Always fires;
   * customer notification gating belongs in the subscriber.
   */
  shipment_delivered: {
    shipmentId: number;
    orderId: number;
  };

  /**
   * Fired on every shipment status write by `updateShipmentStatus`. Carries
   * both the previous (`from`) and new (`to`) status codes plus the
   * resolved `phase` of the new state.
   */
  shipment_status_changed: {
    shipmentId: number;
    orderId: number;
    from: string;
    to: string;
    phase: 'pending' | 'shipped' | 'delivered' | 'canceled';
  };

  /**
   * Fired when a carrier integration successfully purchases a label for a
   * shipment. `labelUrl` may be null when the carrier returns only a tracking
   * number (e.g. drop-off providers).
   */
  shipment_label_created: {
    shipmentId: number;
    orderId: number;
    labelUrl: string | null;
    trackingNumber: string | undefined;
  };

  /**
   * Fired when an admin voids a previously purchased label via
   * `voidShipmentLabel`. The tracking number stays on the shipment for
   * historical record; only the label artifacts (`label_url`, `label_format`)
   * are cleared.
   */
  shipment_label_voided: {
    shipmentId: number;
    orderId: number;
    trackingNumber: string;
  };

  /**
   * Fired when a metafield definition is created.
   * Data: the created metafield_definition (API shape).
   */
  metafield_definition_created: Record<string, any>;

  /**
   * Fired when a metafield definition is updated.
   * Data: the updated metafield_definition (API shape).
   */
  metafield_definition_updated: Record<string, any>;

  /**
   * Fired when a metafield definition is deleted. Drives per-entity prune
   * subscribers that strip the key from each owner table's `meta_data`.
   */
  metafield_definition_deleted: {
    ownerType: string;
    namespace: string;
    fieldKey: string;
  };
}

/**
 * Extract event names from the registry
 */
export type EventName = keyof EventDataRegistry;

/**
 * Get the data type for a specific event
 */
export type EventData<T extends EventName> = EventDataRegistry[T];
