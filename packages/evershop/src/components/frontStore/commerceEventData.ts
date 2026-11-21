import type {
  CommerceCart,
  CommerceCartLineChange,
  CommerceItem
} from '@evershop/evershop/types/commerceEvents';

/**
 * Builds commerce event data (`types/commerceEvents.ts`) from the cart and
 * order lines of the storefront's GraphQL (`ShoppingCartItem`). Amounts are
 * without tax: `finalPrice` and `lineTotalWithDiscount` are, whatever the
 * store's tax display setting (before an address, a store whose catalog
 * prices include tax has no rate to take out: see `types/commerceEvents.ts`).
 */

/** The fields of a cart or order line the events read */
export interface CommerceLine {
  productId: string | number;
  variantGroupId?: string | number | null;
  productSku: string;
  productName?: string | null;
  qty: number;
  thumbnail?: string | null;
  productUrl?: string | null;
  finalPrice?: { value: number } | null;
  finalPriceInclTax?: { value: number } | null;
  lineTotal?: { value: number } | null;
  lineTotalWithDiscount?: { value: number } | null;
  variantOptions?: Array<{ optionText?: string | null } | null> | null;
  category?: { name?: string | null } | null;
}

/** The fields of a cart the events read */
export interface CommerceCartSource {
  uuid?: string;
  currency: string;
  coupon?: string | null;
  totalQty?: number;
  items: CommerceLine[];
}

const minorUnits = new Map<string, number>();

/** The digits of the currency's minor unit (USD 2, JPY 0), 2 when unknown */
export function currencyDigits(currency?: string | null): number {
  if (!currency) {
    return 2;
  }
  let digits = minorUnits.get(currency);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat('en', { style: 'currency', currency })
          .resolvedOptions().maximumFractionDigits ?? 2;
    } catch (e) {
      digits = 2;
    }
    minorUnits.set(currency, digits);
  }
  return digits;
}

/**
 * Rounds to the currency's minor unit. Core keeps a discounted line total
 * at 4 decimals (32.7273); a pixel expects 32.73.
 */
export function roundAmount(n: number, currency?: string | null): number {
  const factor = 10 ** currencyDigits(currency);
  return Math.round(n * factor) / factor;
}

export function absoluteUrl(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }
  if (typeof window === 'undefined') {
    return path;
  }
  try {
    return new URL(path, window.location.origin).href;
  } catch (e) {
    return undefined;
  }
}

/** The line's total after discounts, without tax */
export const netLineTotal = (line: CommerceLine) =>
  line.lineTotalWithDiscount?.value ?? line.lineTotal?.value ?? 0;

/** The line's discount, without tax */
export const lineDiscountTotal = (line: CommerceLine) =>
  (line.lineTotal?.value ?? 0) - netLineTotal(line);

/** `qty` of the line's units, valued as the line values them */
export function lineValue(
  line: CommerceLine,
  qty: number = line.qty,
  currency?: string
): number {
  return line.qty > 0
    ? roundAmount((netLineTotal(line) * qty) / line.qty, currency)
    : 0;
}

/** A cart or order line as an item; `qty` defaults to the line's */
export function toCommerceItem(
  line: CommerceLine,
  qty: number = line.qty,
  currency?: string
): CommerceItem {
  const discountTotal = lineDiscountTotal(line);
  const variant = (line.variantOptions ?? [])
    .map((option) => option?.optionText)
    .filter(Boolean)
    .join(' / ');
  return {
    productId: Number(line.productId),
    variantGroupId:
      line.variantGroupId != null ? Number(line.variantGroupId) : null,
    sku: line.productSku,
    name: line.productName ?? '',
    variant: variant || undefined,
    qty,
    price: line.finalPrice?.value ?? 0,
    priceInclTax: line.finalPriceInclTax?.value,
    discount: line.qty > 0 ? roundAmount(discountTotal / line.qty, currency) : 0,
    url: absoluteUrl(line.productUrl),
    image: absoluteUrl(line.thumbnail),
    categories: line.category?.name ? [line.category.name] : undefined
  };
}

export function toCommerceCart(cart: CommerceCartSource): CommerceCart {
  const items = cart.items ?? [];
  return {
    cartId: cart.uuid ?? '',
    currency: cart.currency,
    value: roundAmount(
      items.reduce((sum, line) => sum + netLineTotal(line), 0),
      cart.currency
    ),
    coupon: cart.coupon || undefined,
    totalQty:
      cart.totalQty ?? items.reduce((sum, line) => sum + (line.qty || 0), 0),
    items: items.map((line) => toCommerceItem(line, line.qty, cart.currency))
  };
}

/**
 * A line's quantity change: `before` is the line before (undefined when it
 * is new), `after` the line now (undefined when it was removed). Returns
 * the event and its data, or null when the quantity did not change.
 */
export function toLineChange(
  before: CommerceLine | undefined,
  after: CommerceLine | undefined,
  cart: CommerceCartSource
): {
  name: 'product_added_to_cart' | 'product_removed_from_cart';
  data: CommerceCartLineChange;
} | null {
  const line = after ?? before;
  if (!line) {
    return null;
  }
  const previousLineQty = before?.qty ?? 0;
  const lineQty = after?.qty ?? 0;
  const change = lineQty - previousLineQty;
  if (change === 0) {
    return null;
  }
  const qty = Math.abs(change);
  return {
    name: change > 0 ? 'product_added_to_cart' : 'product_removed_from_cart',
    data: {
      currency: cart.currency,
      value: lineValue(line, qty, cart.currency),
      items: [toCommerceItem(line, qty, cart.currency)],
      lineQty,
      previousLineQty,
      cart: toCommerceCart(cart)
    }
  };
}

/**
 * Run code that publishes a commerce event. A failure is logged, never
 * thrown: a cart change must not fail because its event could not be built.
 */
export function publishSafely(publish: () => void): void {
  try {
    publish();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Could not publish a commerce event', e);
  }
}
