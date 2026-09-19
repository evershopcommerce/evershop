/**
 * Types for the carrier integration registry.
 *
 * A `Carrier` is the runtime object an extension registers from its
 * `bootstrap.ts` via `registerCarrier(...)`. The registry stores the object
 * in memory (so admin code can invoke its methods) and upserts a thin row
 * into the `carrier` DB table so admin can toggle `is_enabled` / reorder
 * without redeploying the extension.
 *
 * Method shapes are intentionally narrow — each one corresponds to a single
 * carrier capability that the admin UI / `createShipment` flow can light up
 * conditionally. None are required: a "tracking-link-only" carrier (e.g. a
 * regional courier with no API) registers just `generateTrackingUrl` and
 * everything else stays disabled in the admin UI.
 *
 * See wiki/multi-shipment-design.md → "Carrier integration" for the full
 * design discussion.
 */

import type { ShipmentPhase } from './shipmentPhase.js';

/** A weight, mass-quantified — input to `createLabel`. */
export interface Weight {
  value: number;
  unit: 'kg' | 'g' | 'lb' | 'oz';
}

/** A dimension, length-quantified — input to `createLabel`. */
export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'mm' | 'in';
}

/** A monetary amount with its currency — input to `createLabel`. */
export interface Money {
  value: number;
  /** ISO 4217 code (e.g. "USD"). */
  currency: string;
}

/**
 * Shipping address as the carrier API needs it. Built by `createShipment` from
 * the order's `order_address` row.
 */
export interface CarrierAddress {
  fullName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * One line item being shipped — built from `order_item` rows tied to the
 * shipment via `shipment_item`. Carrier providers use these to compute
 * customs declarations, weight totals, etc.
 *
 * `weight` comes from `order_item.product_weight` (in the store's
 * `shop.weightUnit`); `unitPrice` from `order_item.final_price` (the
 * tax-exclusive per-unit transaction value after discounts — the correct
 * customs basis) in the ORDER's currency. Both are populated by
 * `buildCreateLabelInput` whenever the order rows carry them — customs-aware
 * carriers (EasyShip, DHL, international FedEx) must not have to guess
 * declared values.
 */
export interface CarrierItem {
  sku: string;
  name: string;
  qty: number;
  /** Per-unit GOODS weight (no packaging tare — that's parcel-level). */
  weight?: Weight;
  /** Per-unit transaction value in the order's currency. */
  unitPrice?: Money;
  /**
   * The item's package (parcel) dimensions, snapshotted on `order_item` at
   * placement (`package_length/width/height`). Undefined for legacy products
   * with no package and for virtual items.
   */
  dimensions?: Dimensions;
}

/**
 * Parcel-level info passed to `createLabel`. Optional — many carrier APIs
 * derive parcel weight from the item list directly.
 */
export interface Parcel {
  weight?: Weight;
  dimensions?: Dimensions;
  insuranceUsd?: number;
}

/**
 * Input to `Carrier.createLabel`. Built by `createShipment` from the order +
 * items + addresses already on hand. NOTE: no `shipmentId` — `createLabel` is
 * called BEFORE the shipment row is inserted (the network call happens
 * outside the tx, so we can void the label cleanly if the insert fails).
 * Carriers that need to correlate the purchase with our row reference do so
 * via `orderNumber` / `orderId`.
 */
export interface CreateLabelInput {
  orderNumber: string;
  orderId: number;
  shipFrom: CarrierAddress;
  shipTo: CarrierAddress;
  items: CarrierItem[];
  parcel?: Parcel;
  /**
   * Service code in the carrier's vocabulary (e.g. `FEDEX_GROUND`,
   * `usps_priority`). Optional — if absent the provider picks its default.
   * Threaded from `core_shipping_method.default_service_code` through the
   * shipping-method snapshot at `shipping_method_data.snapshot.serviceCode`.
   */
  serviceCode?: string;
}

/**
 * Outcome of a successful `createLabel` call. `labelUrl` is REQUIRED — we
 * never store the binary in DB. `labelFormat` is the MIME type so we know
 * what to render when an admin clicks "Print".
 *
 * `carrierShipmentId` is the carrier's internal id for the shipment
 * (e.g. UPS's `ShipmentIdentificationNumber`), distinct from the
 * customer-visible tracking number. Required by some carriers to void or
 * query the shipment after the fact. Persisted to `shipment.carrier_shipment_id`.
 *
 * `metadata` is a free-form blob aggregator extensions (Shippo / EasyPost)
 * use to record the underlying carrier, rate id, etc. Persisted to
 * `shipment.carrier_metadata` and passed back to the carrier on every
 * subsequent call via `CarrierMethodContext.metadata`.
 */
export interface LabelResult {
  trackingNumber: string;
  labelUrl: string;
  labelFormat: string;
  carrierShipmentId?: string;
  metadata?: Record<string, unknown>;
  /**
   * Public tracking URL for this shipment, when the carrier hands one back
   * at label-purchase time. Aggregators (Shippo's `tracking_url_provider`,
   * EasyPost's `public_url`, ShipStation's `tracking_url`) return this on
   * the buy-label response — and `generateTrackingUrl` can't reconstruct it
   * later because it's synchronous and the envelope intentionally doesn't
   * carry the underlying carrier code.
   *
   * Persisted to `shipment.tracking_url` and read directly by the
   * `Shipment.trackingUrl` resolver. When set, it wins over
   * `Carrier.generateTrackingUrl(ctx)`. Optional — single-carrier extensions
   * that already implement `generateTrackingUrl` can leave it undefined.
   */
  trackingUrl?: string;
}

/**
 * Envelope passed to every carrier method that operates on an existing
 * shipment (`generateTrackingUrl`, `voidLabel`, `fetchStatus`). Carries the
 * three durable identifiers core can hand back to a carrier after the label
 * has been purchased — the customer-visible tracking number, the carrier's
 * internal shipment id, and any aggregator metadata. None of these are
 * derived from request input; they're read off the shipment row.
 */
export interface CarrierMethodContext {
  trackingNumber: string;
  carrierShipmentId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Outcome of `fetchStatus`. `statusCode` is a code the carrier returns
 * (e.g. `out_for_delivery`); convergence to one of our registered shipment
 * statuses happens in C5's `updateShipmentStatusFromCarrier`.
 */
export interface TrackingResult {
  statusCode: string;
  message?: string;
  location?: string;
  /** Carrier-reported phase, when known. Optional sanity check. */
  phase?: ShipmentPhase;
}

/**
 * One shipment in a pickup request, identified the way carrier APIs key
 * pickups — the same durable trio as `CarrierMethodContext`. Carriers must
 * never need to dereference core-internal shipment ids (that would force DB
 * access inside a carrier), so the envelope carries the carrier-side
 * identifiers directly. ShipStation keys pickups on label ids (carried in
 * `metadata.labelId`), UPS on its shipment id, USPS on tracking numbers.
 */
export interface PickupShipmentRef {
  trackingNumber: string;
  carrierShipmentId?: string;
  metadata?: Record<string, unknown>;
}

/** Input to `schedulePickup`. */
export interface PickupRequest {
  shipFrom: CarrierAddress;
  /** The shipments the carrier should collect, by carrier-side identifiers. */
  shipments: PickupShipmentRef[];
  /** ISO-8601 date string. */
  readyDate: string;
  readyTimeFrom?: string;
  readyTimeTo?: string;
}

export interface PickupResult {
  confirmationNumber: string;
  pickupDate?: string;
}

/**
 * The shape an extension's `registerCarrier(...)` call passes in. All method
 * fields are optional — the admin GraphQL `capabilities` block reflects
 * which ones are present so the UI can show/hide actions accordingly.
 */
export interface Carrier {
  /** Stable code, lowercase, kebab/snake — e.g. `fedex`, `usps`, `dhl-express`. */
  code: string;
  /** Display name shown to admin. */
  name: string;
  /** One-liner shown in the admin carrier list. */
  description?: string;

  /**
   * Build the public tracking URL. Synchronous — pure URL composition.
   * Returns null if the carrier doesn't surface a public tracking page.
   * Aggregators read `ctx.metadata` to dispatch to the right sub-carrier's
   * URL template.
   */
  generateTrackingUrl?: (ctx: CarrierMethodContext) => string | null;

  /**
   * Purchase a shipping label. Called by `createShipment` (C4) when the admin
   * chose "Generate shipping label". Must throw on failure so the wrapping
   * transaction rolls back cleanly.
   */
  createLabel?: (input: CreateLabelInput) => Promise<LabelResult>;

  /**
   * Void a previously purchased label. Called by `voidShipmentLabel` before
   * the shipment ships. UPS and similar carriers void by their internal
   * `carrierShipmentId`, not the tracking number — both flow through `ctx`.
   * Carriers without a void API leave this off and the admin UI hides the
   * "Void" button.
   */
  voidLabel?: (ctx: CarrierMethodContext) => Promise<void>;

  /**
   * Fetch live tracking status. Extensions own the polling/webhook flow that
   * calls this; core just defines the contract. `ctx.metadata` is how
   * aggregators identify the underlying carrier without re-querying their
   * own side tables. Returns null on "no info yet" (label purchased, no
   * scans).
   */
  fetchStatus?: (ctx: CarrierMethodContext) => Promise<TrackingResult | null>;

  /**
   * Schedule a pickup with the carrier. Optional carrier capability —
   * surfaces in admin under bulk operations when implemented.
   */
  schedulePickup?: (request: PickupRequest) => Promise<PickupResult>;
}

/** Compact capability map for the admin UI. */
export interface CarrierCapabilities {
  generateTrackingUrl: boolean;
  createLabel: boolean;
  voidLabel: boolean;
  fetchStatus: boolean;
  schedulePickup: boolean;
}

export function getCarrierCapabilities(c: Carrier): CarrierCapabilities {
  return {
    generateTrackingUrl: typeof c.generateTrackingUrl === 'function',
    createLabel: typeof c.createLabel === 'function',
    voidLabel: typeof c.voidLabel === 'function',
    fetchStatus: typeof c.fetchStatus === 'function',
    schedulePickup: typeof c.schedulePickup === 'function'
  };
}
