import type { PurchaseUnit, PurchaseUnitItem } from '@paypal/paypal-js';

// Currencies PayPal only accepts without decimal places. A 2-decimal value
// for these is rejected with DECIMALS_NOT_SUPPORTED.
const ZERO_DECIMAL_CURRENCIES = ['HUF', 'JPY', 'TWD'];

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.includes((currency || '').toUpperCase());
}

export function formatPaypalAmount(value: number, currency: string): string {
  if (isZeroDecimalCurrency(currency)) {
    return String(Math.round(value));
  }
  return (Math.round(value * 100) / 100).toFixed(2);
}

// Orders created with `payment_source` return their redirect link as rel
// "payer-action"; the legacy application_context shape used rel "approve".
// Accept both so the caller doesn't care which request shape produced them.
export function findApprovalUrl(
  links?: Array<{ rel?: string; href?: string }>
): string | undefined {
  return links?.find(
    (link) => link.rel === 'payer-action' || link.rel === 'approve'
  )?.href;
}

interface OrderTotals {
  currency: string;
  grand_total: string | number;
  sub_total?: string | number;
  sub_total_incl_tax?: string | number;
  shipping_fee_excl_tax?: string | number;
  shipping_fee_incl_tax?: string | number;
  discount_amount?: string | number;
  total_tax_amount?: string | number;
}

interface OrderItemRow {
  product_name: string;
  product_sku: string;
  qty: string | number;
  final_price?: string | number;
  final_price_incl_tax?: string | number;
  no_shipping_required?: boolean;
}

export interface PaypalAmountResult {
  amount: PurchaseUnit['amount'];
  items?: PurchaseUnitItem[];
  /**
   * False when the itemized breakdown could not be made to sum exactly to the
   * order's grand total (per-unit rounding drift). In that case `items` is
   * undefined and `amount` carries no breakdown — PayPal accepts a bare
   * amount, while a mismatched breakdown is a 422 that blocks checkout.
   */
  identityHolds: boolean;
}

/**
 * Build the purchase-unit amount (with breakdown) and item list for the
 * PayPal create-order call. All arithmetic runs in integer minor units so the
 * identity `item_total + shipping + tax − discount = grand_total` is checked
 * exactly, never through floats.
 */
export function buildPaypalAmount(
  order: OrderTotals,
  items: OrderItemRow[],
  catalogPriceInclTax: boolean
): PaypalAmountResult {
  const currency = order.currency;
  const factor = isZeroDecimalCurrency(currency) ? 1 : 100;
  const toMinor = (value: string | number | undefined): number =>
    Math.round((parseFloat(String(value ?? 0)) || 0) * factor);
  const fromMinor = (minor: number): string =>
    factor === 1 ? String(minor) : (minor / 100).toFixed(2);

  const lines = items.map((item) => {
    const unitMinor = toMinor(
      catalogPriceInclTax ? item.final_price_incl_tax : item.final_price
    );
    const qty = parseInt(String(item.qty), 10) || 0;
    return {
      item: {
        name: item.product_name,
        sku: item.product_sku,
        quantity: String(qty),
        unit_amount: {
          currency_code: currency,
          value: fromMinor(unitMinor)
        },
        category: item.no_shipping_required
          ? 'DIGITAL_GOODS'
          : 'PHYSICAL_GOODS'
      } as PurchaseUnitItem,
      lineTotalMinor: unitMinor * qty
    };
  });

  const itemTotalMinor = lines.reduce((sum, l) => sum + l.lineTotalMinor, 0);
  const shippingMinor = toMinor(
    catalogPriceInclTax ? order.shipping_fee_incl_tax : order.shipping_fee_excl_tax
  );
  const discountMinor = toMinor(order.discount_amount);
  const taxMinor = catalogPriceInclTax ? 0 : toMinor(order.total_tax_amount);
  const grandMinor = toMinor(order.grand_total);

  const identityHolds =
    itemTotalMinor + shippingMinor + taxMinor - discountMinor === grandMinor;

  if (!identityHolds) {
    return {
      amount: {
        currency_code: currency,
        value: fromMinor(grandMinor)
      } as PurchaseUnit['amount'],
      items: undefined,
      identityHolds
    };
  }

  return {
    amount: {
      currency_code: currency,
      value: fromMinor(grandMinor),
      breakdown: {
        item_total: {
          currency_code: currency,
          value: fromMinor(itemTotalMinor)
        },
        shipping: {
          currency_code: currency,
          value: fromMinor(shippingMinor)
        },
        discount: {
          currency_code: currency,
          value: fromMinor(discountMinor)
        },
        tax_total: catalogPriceInclTax
          ? undefined
          : {
              currency_code: currency,
              value: fromMinor(taxMinor)
            }
      }
    } as PurchaseUnit['amount'],
    items: lines.map((l) => l.item),
    identityHolds
  };
}
