import crypto from 'crypto';
import type {
  ShippingContext,
  ShippingItem
} from '../../../../types/shippingProvider.js';

interface CartItemLike {
  getData(key: string): unknown;
}
interface CartLike {
  getData(key: string): unknown;
  getItems(): CartItemLike[];
}

interface AddressLike {
  country?: string | null;
  province?: string | null;
  postcode?: string | null;
  city?: string | null;
}

/**
 * Subset of an address that affects provider quotes. Different copies of an
 * address with the same destination-relevant fields produce the same hash.
 * Fields like `full_name` and `telephone` are intentionally excluded.
 */
function pickAddressFields(addr: AddressLike | null | undefined): AddressLike {
  return {
    country: addr?.country ?? null,
    province: addr?.province ?? null,
    postcode: addr?.postcode ?? null,
    city: addr?.city ?? null
  };
}

function sha1Hex(payload: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function itemsSignature(
  items: Array<[productId: number, qty: number]>
): Array<[number, number]> {
  const copy = items.slice();
  copy.sort(([aP, aQ], [bP, bQ]) => aP - bP || aQ - bQ);
  return copy;
}

/**
 * Compute a fingerprint for the cart's shipping-relevant state, directly from
 * the live cart DataObject. Used inside the `shipping_method_data` resolver.
 *
 * Origin is intentionally NOT in the fingerprint — origin changes when admin
 * reconfigures the store address, not when the customer changes the cart, and
 * is too rare an event to invalidate cached quotes per-cart.
 */
export function computeFingerprintFromCart(cart: CartLike): string {
  const rawItems = cart.getItems().map((i) => {
    const productId = Math.trunc(toNumber(i.getData('product_id')));
    const qty = Math.trunc(toNumber(i.getData('qty')));
    return [productId, qty] as [number, number];
  });
  const payload = {
    destination: pickAddressFields(
      cart.getData('shipping_address') as AddressLike | null | undefined
    ),
    totalWeight: toNumber(cart.getData('total_weight')),
    totalValue: toNumber(cart.getData('sub_total')),
    items: itemsSignature(rawItems)
  };
  return sha1Hex(payload);
}

/**
 * Compute a fingerprint from a `ShippingContext`. Used by the per-request
 * memoization layer for `provider.getMethods`.
 *
 * Produces the same hash as `computeFingerprintFromCart` for the same logical
 * cart state — the two helpers MUST stay in sync if the algorithm changes.
 */
export function computeFingerprintFromCtx(ctx: ShippingContext): string {
  const rawItems = ctx.items.map(
    (i: ShippingItem) => [i.productId, i.qty] as [number, number]
  );
  const payload = {
    destination: pickAddressFields(ctx.destination as AddressLike),
    totalWeight: ctx.totalWeight,
    totalValue: ctx.totalValue,
    items: itemsSignature(rawItems)
  };
  return sha1Hex(payload);
}
