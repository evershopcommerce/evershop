/**
 * Browser commerce events: what the storefront publishes on the commerce
 * event bus (`components/common/commerceEvents.ts`) for analytics and
 * marketing pixels. One payload shape for every consumer (GA4, Meta, TikTok,
 * Klaviyo, ...); an adapter maps it to its vendor's event.
 *
 * Amounts follow GA4: `value` is Σ (price − discount) × qty, without tax and
 * without shipping, rounded to the currency's minor unit. It is rounded once,
 * from the line totals, while each item's `discount` is a per-unit amount
 * rounded on its own: the items can add up to a cent more or less than
 * `value` (a 10 % coupon on 18.18 is 1.818 per unit). One exception: a
 * store whose catalog prices include tax has no tax rate to take out before
 * the shopper gives an address, so until then cart amounts include tax, as
 * the cart itself does (`final_price`).
 *
 * These are browser events: any script on the page can publish one, so
 * treat their amounts as untrusted. The server's `order_placed` event is the
 * record of a sale.
 */

/** A product, or a cart or order line */
export interface CommerceItem {
  /** The product's id; for a variant, the variant's own product */
  productId: number;
  /** The variant group the product belongs to, or null */
  variantGroupId: number | null;
  /**
   * The product's own SKU (a variant's, never its group's). A pixel's
   * product feed should use the same id.
   */
  sku: string;
  name: string;
  /** The variant's options, such as "Red / M" */
  variant?: string;
  qty: number;
  /**
   * Unit price, without tax and before any discount (see the note on tax
   * before an address at the top). On `product_viewed` the catalog price as
   * entered: see that event's `taxIncluded`.
   */
  price: number;
  /** Unit price with tax, when known (cart and order lines) */
  priceInclTax?: number;
  /** Discount per unit, without tax: the line's share of a coupon, rounded */
  discount: number;
  /** Absolute URL of the product page */
  url?: string;
  /** Absolute URL of the product image */
  image?: string;
  /** The product's category, when it has one (on cart and order lines: its category now) */
  categories?: string[];
}

export interface CommerceCart {
  /** The cart's uuid; '' when there is no cart (none yet, or its last item was removed) */
  cartId: string;
  currency: string;
  /** The lines' total after discounts: without tax and shipping */
  value: number;
  coupon?: string;
  totalQty: number;
  items: CommerceItem[];
}

/**
 * A line's quantity went up (`product_added_to_cart`) or down
 * (`product_removed_from_cart`). A change from 2 to 5 is "added" with qty 3.
 */
export interface CommerceCartLineChange {
  currency: string;
  /** The change's value: (price − discount) × the changed qty */
  value: number;
  /** The line, with `qty` = the change */
  items: CommerceItem[];
  /** The line's quantity now (0 when it was removed) */
  lineQty: number;
  /** The line's quantity before (0 when it is new) */
  previousLineQty: number;
  /** The whole cart after the change */
  cart: CommerceCart;
}

/**
 * Event names and their data. An extension adds its own events by
 * declaration merging, with a prefixed name:
 *
 * ```ts
 * declare module '@evershop/evershop/types/commerceEvents' {
 *   interface CommerceEventDataRegistry {
 *     'myext:popup_shown': { popupId: string };
 *   }
 * }
 * ```
 */
export interface CommerceEventDataRegistry {
  /** A product page is shown, and again when a variant switch changes the product */
  product_viewed: {
    currency: string;
    value: number;
    /**
     * Whether `price` includes tax. It is the catalog price as entered,
     * which includes tax when the store's catalog prices do; the tax rate
     * depends on an address the product page does not have.
     */
    taxIncluded: boolean;
    items: CommerceItem[];
  };
  product_added_to_cart: CommerceCartLineChange;
  product_removed_from_cart: CommerceCartLineChange;
  /** The cart page is shown */
  cart_viewed: CommerceCart;
  coupon_applied: { coupon: string; cart: CommerceCart };
  coupon_removed: { coupon: string; cart: CommerceCart };
  /** The checkout page is shown */
  checkout_started: CommerceCart;
  /**
   * The checkout has the shopper's email. A guest: their email was saved to
   * the cart (they left the email field after changing it, or autofill
   * filled it), once per new email. A logged-in customer: the checkout page
   * is shown (the cart has the account email), right after
   * `checkout_started`, once per cart and customer in a browser session. The
   * email is not in the payload.
   */
  checkout_contact_info_submitted: CommerceCart & {
    /** True for a logged-in customer, who typed nothing */
    loggedIn: boolean;
  };
  /** A shipping method is chosen at checkout */
  checkout_shipping_info_submitted: CommerceCart & {
    /** `code` is an id (a uuid for a core method); `name` is what the shopper sees */
    shippingMethod: { code: string; name: string };
  };
  /** The order is submitted with its payment method (the order now exists) */
  payment_info_submitted: CommerceCart & {
    paymentMethod: { code: string; name: string };
  };
  /**
   * The order success page is shown: once per order in a browser. The
   * event's `id` is the order uuid, so a server-side sender can use the same
   * id and the vendor counts the sale once.
   */
  checkout_completed: {
    /** The order's uuid */
    orderId: string;
    orderNumber: string;
    /**
     * Whether the order is placed (`order.placed_at`): payment accepted, or
     * a method that needs none up front. A method can place the order after
     * this page loads (Stripe does it from its webhook), so false does not
     * mean the payment failed.
     */
    placed: boolean;
    paymentStatus: string | null;
    currency: string;
    /** The lines' total after discounts: without tax and shipping */
    value: number;
    tax: number;
    /** Shipping without tax */
    shipping: number;
    /** The total discount, without tax */
    discount: number;
    /** What the customer pays: the grand total */
    total: number;
    coupon?: string;
    items: CommerceItem[];
  };
}

export type CommerceEventName = keyof CommerceEventDataRegistry;

/** The page the event happened on, when it happened */
export interface CommerceEventContext {
  url: string;
  referrer: string;
  title: string;
  language: string;
}

export interface CommerceEvent<
  N extends CommerceEventName = CommerceEventName
> {
  /**
   * Unique per event. Send it as the vendor's event id (Meta `eventID`,
   * TikTok and Pinterest `event_id`) so a server-side copy is counted once.
   */
  id: string;
  name: N;
  version: 1;
  /** ISO 8601 */
  timestamp: string;
  /** The event's number on this page, from 1 */
  seq: number;
  /** True when delivered to a listener that subscribed after it happened */
  replayed: boolean;
  context: CommerceEventContext;
  data: CommerceEventDataRegistry[N];
}

/** Any one event, narrowed by `name` */
export type AnyCommerceEvent = {
  [N in CommerceEventName]: CommerceEvent<N>;
}[CommerceEventName];

export type ConsentCategory = 'analytics' | 'marketing';

export interface CommerceEventListenerOptions {
  /** Receive the page's earlier events first (default true) */
  replay?: boolean;
  /**
   * The consent categories this listener needs. Recorded now, without
   * effect: once cookie consent ships, the bus holds the listener's events
   * until they are granted.
   */
  consent?: ConsentCategory[];
}

/** `onCommerceEvent` of `components/common/commerceEvents.ts` */
export interface OnCommerceEvent {
  <N extends CommerceEventName>(
    name: N,
    handler: (event: CommerceEvent<N>) => void,
    options?: CommerceEventListenerOptions
  ): () => void;
  (
    name: '*',
    handler: (event: AnyCommerceEvent) => void,
    options?: CommerceEventListenerOptions
  ): () => void;
}

declare global {
  interface Window {
    /**
     * Set on storefront pages for scripts outside the bundle (Google Tag
     * Manager, for example): a stub in the page's head queues calls until
     * the bus loads.
     */
    evershop?: {
      onCommerceEvent?: OnCommerceEvent;
    };
  }
}
