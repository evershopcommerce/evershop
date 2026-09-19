import type { ShippingItem } from '../../../../types/shippingProvider.js';
import { getDimensionUnit } from '../../../setting/services/setting.js';

/**
 * Minimal interface a cart item must satisfy. Avoids depending on the
 * concrete `CartItem` class (JS) from the type layer.
 */
interface CartItemLike {
  getData(key: string): unknown;
}

interface CartLike {
  getItems(): CartItemLike[];
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toInt(value: unknown): number {
  const n = toNumber(value);
  return Math.trunc(n);
}

/**
 * Serialize a cart's items into immutable `ShippingItem` DTOs.
 *
 * Providers see plain objects only — never CartItem or DataObject instances.
 * Numeric fields are coerced from PostgreSQL's `numeric` (string) and
 * defaulted to 0 on missing/invalid data, mirroring the same coercion the
 * cart pipeline already does for cart totals.
 *
 * See wiki/shipping-provider-design.md → "Provider DTO principle".
 */
/** Normalize the store dimension unit (admin setting) to the `Dimensions.unit` vocabulary. */
function dimensionUnit(): 'cm' | 'mm' | 'in' {
  const unit = String(getDimensionUnit()).toLowerCase();
  return unit === 'mm' || unit === 'in' ? unit : 'cm';
}

export function serializeItems(cart: CartLike): ShippingItem[] {
  const unit = dimensionUnit();
  return cart.getItems().map((item) => {
    // Package (parcel) dims snapshot from the cart item — undefined when the
    // product has no package (legacy/virtual); providers use their fallback.
    const length = toNumber(item.getData('package_length'));
    const width = toNumber(item.getData('package_width'));
    const height = toNumber(item.getData('package_height'));
    const hasDims = length > 0 && width > 0;
    return {
      productId: toInt(item.getData('product_id')),
      sku: String(item.getData('product_sku') ?? ''),
      name: String(item.getData('product_name') ?? ''),
      qty: toInt(item.getData('qty')),
      weight: toNumber(item.getData('product_weight')),
      unitPrice: toNumber(item.getData('final_price')),
      lineTotal: toNumber(item.getData('line_total')),
      noShippingRequired: Boolean(item.getData('no_shipping_required')),
      dimensions: hasDims ? { length, width, height, unit } : undefined
    };
  });
}
