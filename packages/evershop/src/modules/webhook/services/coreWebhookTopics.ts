import type { WebhookTopic } from '../types/index.js';

/**
 * The events an admin can send to a webhook. Labels and descriptions are
 * English source strings; the GraphQL resolver translates them per request.
 * Descriptions say what the receiver GETS, because several events carry only
 * ids (see `types/event.ts`).
 */
export const coreWebhookTopics: WebhookTopic[] = [
  {
    group: 'Orders',
    name: 'order_placed',
    label: 'Order placed',
    description:
      'An order is placed: payment succeeded, or the payment method (such as Cash on Delivery) does not need it up front. Use this for "new order" notifications. Sends the order.'
  },
  {
    group: 'Orders',
    name: 'order_created',
    label: 'Order created',
    description:
      'An order record is created, whatever its payment state. For online payments this can happen before "Order placed". Sends the order.'
  },
  {
    group: 'Orders',
    name: 'order_status_updated',
    label: 'Order status changed',
    description:
      "An order's status changes. Sends the order ID and the previous and new status."
  },
  {
    group: 'Orders',
    name: 'order_canceled',
    label: 'Order canceled',
    description:
      'An order is canceled. Sends the order ID and the reason, if one was given.'
  },
  {
    group: 'Orders',
    name: 'order_refunded',
    label: 'Order refunded',
    description:
      'An order is refunded, fully or partly. Sends the order ID, amount, currency, whether it is a full refund, the transaction ID and the payment method.'
  },
  {
    group: 'Shipments',
    name: 'shipment_created',
    label: 'Shipment created',
    description:
      'A shipment is created for an order. Sends the shipment ID, the order ID and whether the customer should be notified.'
  },
  {
    group: 'Shipments',
    name: 'shipment_status_changed',
    label: 'Shipment status changed',
    description:
      "A shipment's status changes. Sends the shipment ID, order ID, previous and new status, and the phase."
  },
  {
    group: 'Shipments',
    name: 'shipment_delivered',
    label: 'Shipment delivered',
    description:
      'A shipment reaches the delivered phase. Sends the shipment ID and the order ID.'
  },
  {
    group: 'Shipments',
    name: 'shipment_label_created',
    label: 'Shipping label created',
    description:
      'A carrier label is purchased for a shipment. Sends the shipment ID, order ID, label URL (can be empty) and tracking number.'
  },
  {
    group: 'Shipments',
    name: 'shipment_label_voided',
    label: 'Shipping label voided',
    description:
      'An admin voids a shipping label. Sends the shipment ID, order ID and tracking number.'
  },
  {
    group: 'Products',
    name: 'product_created',
    label: 'Product created',
    description: 'A product is created. Sends the product.'
  },
  {
    group: 'Products',
    name: 'product_updated',
    label: 'Product updated',
    description: 'A product is updated. Sends the product.'
  },
  {
    group: 'Products',
    name: 'product_deleted',
    label: 'Product deleted',
    description: 'A product is deleted. Sends the deleted product.'
  },
  {
    group: 'Products',
    name: 'inventory_updated',
    label: 'Inventory updated',
    description:
      "A product's inventory changes. Sends the inventory before and after the change."
  },
  {
    group: 'Categories',
    name: 'category_created',
    label: 'Category created',
    description: 'A category is created. Sends the category.'
  },
  {
    group: 'Categories',
    name: 'category_updated',
    label: 'Category updated',
    description: 'A category is updated. Sends the category.'
  },
  {
    group: 'Categories',
    name: 'category_deleted',
    label: 'Category deleted',
    description: 'A category is deleted. Sends the deleted category.'
  },
  {
    group: 'Customers',
    name: 'customer_created',
    label: 'Customer created',
    description:
      'A customer account is created, whatever its status. Sends the customer (never the password).'
  },
  {
    group: 'Customers',
    name: 'customer_registered',
    label: 'Customer registered',
    description:
      'A customer account is created and active. Sends the customer (never the password).'
  },
  {
    group: 'Customers',
    name: 'customer_updated',
    label: 'Customer updated',
    description:
      'A customer account is updated. Sends the customer (never the password).'
  },
  {
    group: 'Customers',
    name: 'customer_deleted',
    label: 'Customer deleted',
    description:
      'A customer account is deleted. Sends the deleted customer (never the password).'
  }
];
