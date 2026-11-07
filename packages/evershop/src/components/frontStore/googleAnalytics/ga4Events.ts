import { roundAmount } from '@components/frontStore/commerceEventData.js';
import type {
  AnyCommerceEvent,
  CommerceItem
} from '@evershop/evershop/types/commerceEvents';

/**
 * Commerce events (`components/common/commerceEvents.ts`) as GA4's
 * recommended ecommerce events, for `gtag('event', name, params)`.
 * `GoogleAnalytics.tsx` sends them when the store has a Measurement ID.
 *
 * Only events GA4 has a name for. `checkout_contact_info_submitted` and the
 * coupon events have none, so they are not sent.
 */
export interface Ga4Event {
  name: string;
  params: Record<string, unknown>;
}

export interface Ga4Item {
  item_id: string;
  item_name: string;
  item_variant?: string;
  /**
   * The unit price after the discount. The discount is rounded per unit, so
   * Σ price × quantity can differ from the event's value by up to half a
   * cent (the currency's smallest unit) per unit
   */
  price: number;
  /** The discount per unit */
  discount?: number;
  /** The coupon that gave the discount (GA4's "Item coupon") */
  coupon?: string;
  quantity: number;
  [category: `item_category${string}`]: string;
}

/** GA4 takes five category levels: item_category, item_category2 … 5 */
const CATEGORY_LEVELS = 5;

/**
 * `coupon`: the cart's or order's coupon. Only an item with a discount gets
 * it: a coupon for some products discounts only those, and in core an item's
 * discount comes only from the coupon.
 */
export function toGa4Item(
  item: CommerceItem,
  currency: string,
  coupon?: string
): Ga4Item {
  const ga4Item: Ga4Item = {
    item_id: item.sku,
    item_name: item.name,
    price: roundAmount(item.price - (item.discount || 0), currency),
    quantity: item.qty
  };
  if (item.variant) {
    ga4Item.item_variant = item.variant;
  }
  if (item.discount > 0) {
    ga4Item.discount = item.discount;
    if (coupon) {
      ga4Item.coupon = coupon;
    }
  }
  (item.categories ?? []).slice(0, CATEGORY_LEVELS).forEach((name, i) => {
    ga4Item[`item_category${i === 0 ? '' : i + 1}`] = name;
  });
  return ga4Item;
}

/**
 * currency, value and items, which every GA4 ecommerce event has, and the
 * coupon when the event's data has one (the cart and order events). The
 * add/remove events have it only inside `data.cart`: their discounted items
 * get it, the event does not (GA4's add_to_cart has no event coupon).
 */
function amounts(data: {
  currency: string;
  value: number;
  coupon?: string;
  cart?: { coupon?: string };
  items: CommerceItem[];
}): Record<string, unknown> {
  const params: Record<string, unknown> = {
    currency: data.currency,
    value: data.value
  };
  if (data.coupon) {
    params.coupon = data.coupon;
  }
  const itemCoupon = data.coupon || data.cart?.coupon;
  params.items = data.items.map((item) =>
    toGa4Item(item, data.currency, itemCoupon)
  );
  return params;
}

/** The GA4 event for a commerce event, or null when GA4 has none */
export function toGa4Event(event: AnyCommerceEvent): Ga4Event | null {
  // GA4 requires items. An empty cart's page view (cart_viewed is published
  // for it, and /checkout redirects there) is not a cart view. A purchase is
  // sent whatever its items: its revenue counts.
  const items = (event.data as { items?: CommerceItem[] } | null)?.items;
  if (
    event.name !== 'checkout_completed' &&
    Array.isArray(items) &&
    items.length === 0
  ) {
    return null;
  }
  switch (event.name) {
    case 'product_viewed':
      return { name: 'view_item', params: amounts(event.data) };
    case 'product_added_to_cart':
      // The line change: `value` and `items` are the units added
      return { name: 'add_to_cart', params: amounts(event.data) };
    case 'product_removed_from_cart':
      return { name: 'remove_from_cart', params: amounts(event.data) };
    case 'cart_viewed':
      return { name: 'view_cart', params: amounts(event.data) };
    case 'checkout_started':
      return { name: 'begin_checkout', params: amounts(event.data) };
    case 'checkout_shipping_info_submitted':
      return {
        name: 'add_shipping_info',
        params: {
          ...amounts(event.data),
          shipping_tier: event.data.shippingMethod.name
        }
      };
    case 'payment_info_submitted':
      return {
        name: 'add_payment_info',
        params: {
          ...amounts(event.data),
          payment_type: event.data.paymentMethod.name
        }
      };
    case 'checkout_completed':
      // Once per order in a browser (CheckoutCompletedEvent remembers the
      // order). GA4 drops a repeated transaction_id only for the same user
      return {
        name: 'purchase',
        params: {
          transaction_id: event.data.orderNumber || event.data.orderId,
          ...amounts(event.data),
          tax: event.data.tax,
          shipping: event.data.shipping
        }
      };
    default:
      return null;
  }
}
