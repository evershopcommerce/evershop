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
 * declare module '@storefront/core/types/event' {
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
   * Fired when a new customer is registered
   * Data: Complete customer table row
   */
  customer_registered: CustomerRow;

  /**
   * Fired when a new order is created
   * Data: Complete order table row
   */
  order_created: OrderRow;

  /**
   * Fired when a new order is placed
   * Data: Complete order table row
   */
  order_placed: OrderRow;

  /**
   * Fired when a new customer is created by admin
   * Data: Complete customer table row
   */
  customer_created: CustomerRow;

  /**
   * Fired when a customer is updated by admin
   * Data: Complete customer table row
   */
  customer_updated: CustomerRow;

  /**
   * Fired when a customer is deleted by admin
   * Data: Complete customer table row
   */
  customer_deleted: CustomerRow;
}

/**
 * Extract event names from the registry
 */
export type EventName = keyof EventDataRegistry;

/**
 * Get the data type for a specific event
 */
export type EventData<T extends EventName> = EventDataRegistry[T];
