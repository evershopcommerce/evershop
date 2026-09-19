/**
 * Public types for the shipping provider abstraction.
 *
 * See wiki/shipping-provider-design.md for the architecture and contract.
 *
 * The contract:
 *   - A provider registers via `registerShippingProvider` in its module's bootstrap.
 *   - At checkout the platform builds an immutable `ShippingContext` DTO and calls
 *     `provider.getMethods(ctx)`. The provider returns the methods available for
 *     that cart + address combination.
 *   - Providers never see `Cart`, `CartItem`, `DataObject`, or any other class
 *     instance from the cart pipeline — only the curated DTO.
 */

import type { Address } from './customerAddress.js';
import type { ShippingZoneRow } from './db/index.js';

/**
 * Validation rules for a zone-config field — a JSON-serializable subset of
 * react-hook-form's RegisterOptions (this object travels over GraphQL to the
 * admin form). `pattern.value` is a regex SOURCE string; the form renderer
 * compiles it.
 */
export interface ZoneConfigFieldValidation {
  /** Error message shown when the field is empty. */
  required?: string;
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: string; message: string };
}

/**
 * One field of a provider's per-zone configuration form (the Attach Provider
 * dialog and the attachment's Configure dialog). Purpose-built — NOT JSON
 * Schema: the admin renders these with EverShop's built-in form fields, so
 * the vocabulary is exactly what those components support. Field order =
 * render order.
 *
 * type → component:
 *   'text'     → InputField
 *   'number'   → NumberField
 *   'textarea' → TextareaField   (long values, e.g. big allow-lists)
 *   'select'   → SelectField     (requires `options`)
 *   'toggle'   → ToggleField     (boolean config values)
 */
export interface ZoneConfigField {
  /** Key in `shipping_zone_provider.config` (and `ctx.zoneConfig`). */
  name: string;
  /** Which built-in control renders this field. */
  type: 'text' | 'number' | 'textarea' | 'select' | 'toggle';
  /** Form label. */
  label: string;
  /** Input placeholder (text / number / textarea / select). */
  placeholder?: string;
  /** Help text rendered under the input. */
  description?: string;
  /** Initial value when attaching; fallback when the config has no value. */
  defaultValue?: string | number | boolean;
  /** Choices — required when type is 'select', ignored otherwise. */
  options?: Array<{ value: string | number; label: string }>;
  /** Labels for the two toggle states ('toggle' only). */
  trueLabel?: string;
  falseLabel?: string;
  validation?: ZoneConfigFieldValidation;
}

/**
 * Delivery window returned with a shipping method. All fields optional.
 */
export interface DeliveryWindow {
  minBusinessDays?: number;
  maxBusinessDays?: number;
  /** ISO 8601 date string. */
  estimatedDate?: string;
}

/**
 * A shipping method as returned by a provider's `getMethods`.
 */
export interface ShippingMethod {
  /**
   * Stable identifier within this provider. Provider-defined format
   * (Core uses `core_shipping_method.uuid`; carrier providers typically use
   * their service code like `"USPS_PRIORITY"`).
   */
  code: string;
  /** Customer-facing name (e.g., "USPS Priority Mail"). */
  name: string;
  /**
   * Cost in cart currency (= `ShippingContext.currency`), tax-exclusive.
   * Provider MUST return cost in the cart currency or return no methods.
   */
  cost: number;
  /** Optional override of the default shipping tax class. */
  taxClass?: string;
  /** Carrier display name (e.g., "USPS"). Stored on shipment record. */
  carrier?: string;
  /** Internal carrier service code (for future label-purchase integrations). */
  serviceCode?: string;
  /** Delivery window. */
  delivery?: DeliveryWindow;
  /** Provider-specific data (quote IDs, label refs). Opaque to core. */
  metadata?: Record<string, unknown>;
}

/**
 * Plain DTO passed to providers. No methods, no class instances — providers
 * don't depend on Cart/CartItem internals.
 */
export interface ShippingItem {
  productId: number;
  sku: string;
  name: string;
  qty: number;
  /** Per-unit GOODS weight (no packaging tare — that's parcel-level). */
  weight: number;
  /** Tax-exclusive unit price. */
  unitPrice: number;
  /** qty × unitPrice. */
  lineTotal: number;
  noShippingRequired: boolean;
  /**
   * The product's package (parcel) dimensions in the store's dimension unit
   * (`shop.dimensionUnit`). Undefined for legacy products with no package
   * assigned and for virtual items — providers fall back to their own
   * defaults. See wiki/package-management-design.md.
   */
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'in';
  };
}

/**
 * The DTO a provider receives on every getMethods / validateMethod call.
 *
 * Built by `buildShippingContext` from the cart and the provider/zone config
 * rows. Immutable — providers should treat it as read-only.
 */
export interface ShippingContext {
  /** Where the package ships FROM. Composed from store settings. */
  origin: Address;
  /** Where the package ships TO. From cart's shipping address. */
  destination: Address;
  /** The resolved zone for the destination. */
  zone: ShippingZoneRow;
  /** Items as immutable DTOs. */
  items: ShippingItem[];
  /** Sum of item.weight × item.qty across all items. */
  totalWeight: number;
  /** Cart sub_total (tax-exclusive). */
  totalValue: number;
  /**
   * Cart currency code (e.g., "USD"). Directive, not informational:
   * the provider MUST return ShippingMethod.cost in this currency, or return
   * an empty methods array if it can't quote in this currency.
   */
  currency: string;
  /** Per-zone-provider config from shipping_zone_provider.config; shape per zoneConfigSchema. */
  zoneConfig: Record<string, unknown>;
  /**
   * Reserved. Always `{}` under the registry-only model — global provider
   * config was hoisted out before release (the registry IS the provider
   * list, secrets read from `process.env`, per-zone state lives in
   * `zoneConfig` above). Kept in the type for binary compatibility with
   * extensions that destructure it; new providers should ignore it.
   */
  providerConfig: Record<string, unknown>;
}

/**
 * Registered shipping provider. One instance per installed integration
 * (Core, USPS, FedEx, EasyPost, ...).
 */
export interface ShippingProvider {
  /** Unique code across the system. Stored on cart.shipping_method_data.provider_code. */
  code: string;
  /** Display name in admin UI. */
  name: string;
  /** Description for admin UI. */
  description?: string;

  /**
   * The per-zone provider config form (Attach Provider dialog + the
   * attachment's Configure dialog), declared field-by-field. Values are
   * saved to `shipping_zone_provider.config` and handed back via
   * `ctx.zoneConfig`. Omit/empty = no per-zone configuration.
   */
  zoneConfigFields?: ZoneConfigField[];

  /**
   * Return available methods for this cart + address.
   * Must be safe to call repeatedly with the same inputs (results are
   * memoized per-request and cached on the cart via fingerprint).
   * Return an empty array if the provider cannot serve this address/cart.
   */
  getMethods(ctx: ShippingContext): Promise<ShippingMethod[]>;

  /**
   * Re-validate a previously-selected method against the current cart state.
   * Default behavior (when not implemented): `getMethods(ctx).find(m => m.code === methodCode)`.
   * Providers can override for a cheaper one-method API call.
   * Return `null` if the method is no longer available.
   */
  validateMethod?(
    ctx: ShippingContext,
    methodCode: string
  ): Promise<ShippingMethod | null>;

  /**
   * Quote validity in seconds. A stored cart snapshot older than this is
   * treated as stale and re-quoted on the next cart rebuild — even when the
   * fingerprint matches.
   *
   * Omit for providers whose quotes don't expire by time (Core,
   * admin-configured table-rate providers). Real-time carrier providers
   * should set this to their underlying quote window — typically 900s
   * (15 min) to a few hours.
   */
  quoteTtlSeconds?: number;

  /**
   * Per-provider budget (ms) for a single `getMethods` call before the
   * orchestrator gives up on this provider for the request (other providers'
   * methods still return — the fan-out is allSettled). Defaults to 5000ms.
   *
   * Set this when the upstream API is structurally slower than the default —
   * e.g. aggregators that rate-shop every connected carrier in one call
   * (ShipStation) can legitimately need 10-20s. Keep it as low as honest:
   * this budget is checkout-blocking time for the customer when the quote
   * isn't served from the fingerprint/TTL cache.
   */
  quoteTimeoutMs?: number;

  // purchaseMethod intentionally not in v1. Provider abstraction is open to
  // add it later as an optional method without breaking existing providers.
  // See "Deferred" in wiki/shipping-provider-design.md.
}
