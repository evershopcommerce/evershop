/**
 * ============================================================================
 * EVERSHOP DATABASE TYPES
 * ============================================================================
 *
 * This file contains TypeScript type definitions for all database tables.
 * These types are auto-generated from the PostgreSQL schema and should be
 * used throughout the codebase for type safety.
 *
 * Usage:
 *   import type { OrderRow, ProductRow } from '@evershop/evershop/src/types/db';
 *
 * Conventions:
 *   - `XxxRow`: Represents a full row from the table (SELECT *)
 *   - `XxxInsert`: Fields for inserting (omits auto-generated fields)
 *   - `XxxUpdate`: Fields for updating (all optional except PK)
 */

// =============================================================================
// ADMIN USER
// =============================================================================

export interface AdminUserRow {
  admin_user_id: number;
  uuid: string;
  status: boolean;
  email: string;
  password: string;
  full_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export type AdminUserInsert = Omit<
  AdminUserRow,
  'admin_user_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type AdminUserUpdate = Partial<Omit<AdminUserRow, 'admin_user_id'>>;

// =============================================================================
// ATTRIBUTE
// =============================================================================

export interface AttributeRow {
  attribute_id: number;
  uuid: string;
  attribute_code: string;
  attribute_name: string;
  type: string;
  is_required: boolean;
  display_on_frontend: boolean;
  sort_order: number;
  is_filterable: boolean;
}

export type AttributeInsert = Omit<AttributeRow, 'attribute_id' | 'uuid'>;
export type AttributeUpdate = Partial<Omit<AttributeRow, 'attribute_id'>>;

// =============================================================================
// ATTRIBUTE GROUP
// =============================================================================

export interface AttributeGroupRow {
  attribute_group_id: number;
  uuid: string;
  group_name: string;
  created_at: Date;
  updated_at: Date;
}

export type AttributeGroupInsert = Omit<
  AttributeGroupRow,
  'attribute_group_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type AttributeGroupUpdate = Partial<
  Omit<AttributeGroupRow, 'attribute_group_id'>
>;

// =============================================================================
// ATTRIBUTE GROUP LINK
// =============================================================================

export interface AttributeGroupLinkRow {
  attribute_group_link_id: number;
  attribute_id: number;
  group_id: number;
}

export type AttributeGroupLinkInsert = Omit<
  AttributeGroupLinkRow,
  'attribute_group_link_id'
>;
export type AttributeGroupLinkUpdate = Partial<
  Omit<AttributeGroupLinkRow, 'attribute_group_link_id'>
>;

// =============================================================================
// ATTRIBUTE OPTION
// =============================================================================

export interface AttributeOptionRow {
  attribute_option_id: number;
  uuid: string;
  attribute_id: number;
  attribute_code: string;
  option_text: string;
}

export type AttributeOptionInsert = Omit<
  AttributeOptionRow,
  'attribute_option_id' | 'uuid'
>;
export type AttributeOptionUpdate = Partial<
  Omit<AttributeOptionRow, 'attribute_option_id'>
>;

// =============================================================================
// CART
// =============================================================================

export interface CartRow {
  cart_id: number;
  uuid: string;
  sid: string | null;
  currency: string;
  customer_id: number | null;
  customer_group_id: number | null;
  customer_email: string | null;
  customer_full_name: string | null;
  user_ip: string | null;
  status: boolean;
  coupon: string | null;
  shipping_fee_excl_tax: string | null;
  shipping_fee_incl_tax: string | null;
  discount_amount: string | null;
  sub_total: string;
  sub_total_incl_tax: string;
  sub_total_with_discount: string;
  sub_total_with_discount_incl_tax: string;
  total_qty: number;
  total_weight: string | null;
  tax_amount: string;
  tax_amount_before_discount: string;
  shipping_tax_amount: string;
  grand_total: string;
  /**
   * Structured shipping selection. Shape:
   *   { provider_code, method_code, snapshot, fingerprint?, quotedAt? }
   * Always set via the `setShippingMethod(cart, intent)` service, never
   * directly via `setData('shipping_method_data', ...)`. See
   * services/setShippingMethod.ts and types/shippingMethodData.ts.
   */
  shipping_method_data: Record<string, unknown> | null;
  shipping_address_id: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  billing_address_id: number | null;
  shipping_note: string | null;
  created_at: Date;
  updated_at: Date;
  total_tax_amount: string | null;
  no_shipping_required: boolean;
}

export type CartInsert = Omit<
  CartRow,
  'cart_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CartUpdate = Partial<Omit<CartRow, 'cart_id'>>;

// =============================================================================
// CART ADDRESS
// =============================================================================

export interface CartAddressRow {
  cart_address_id: number;
  uuid: string;
  full_name: string | null;
  postcode: string | null;
  telephone: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  address_1: string | null;
  address_2: string | null;
}

export type CartAddressInsert = Omit<
  CartAddressRow,
  'cart_address_id' | 'uuid'
>;
export type CartAddressUpdate = Partial<
  Omit<CartAddressRow, 'cart_address_id'>
>;

// =============================================================================
// CART ITEM
// =============================================================================

export interface CartItemRow {
  cart_item_id: number;
  uuid: string;
  cart_id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  thumbnail: string | null;
  product_weight: string | null;
  /** Package (parcel) snapshot — refreshed from the product's package on
   *  cart rebuild. Dims in shop.dimensionUnit; package_weight = TARE in
   *  shop.weightUnit. NULL for legacy/virtual products. */
  package_length: string | null;
  package_width: string | null;
  package_height: string | null;
  package_weight: string | null;
  product_price: string;
  product_price_incl_tax: string;
  qty: number;
  final_price: string;
  final_price_incl_tax: string;
  tax_percent: string;
  tax_amount: string;
  tax_amount_before_discount: string;
  discount_amount: string;
  line_total: string;
  line_total_with_discount: string;
  line_total_incl_tax: string;
  line_total_with_discount_incl_tax: string;
  variant_group_id: number | null;
  variant_options: string | null;
  product_custom_options: string | null;
  created_at: Date;
  updated_at: Date;
  no_shipping_required: boolean;
}

export type CartItemInsert = Omit<
  CartItemRow,
  'cart_item_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CartItemUpdate = Partial<Omit<CartItemRow, 'cart_item_id'>>;

// =============================================================================
// CATEGORY
// =============================================================================

export interface CategoryRow {
  category_id: number;
  uuid: string;
  status: boolean;
  parent_id: number | null;
  include_in_nav: boolean;
  position: number | null;
  show_products: boolean;
  meta_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type CategoryInsert = Omit<
  CategoryRow,
  'category_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CategoryUpdate = Partial<Omit<CategoryRow, 'category_id'>>;

// =============================================================================
// CATEGORY DESCRIPTION
// =============================================================================

export interface CategoryDescriptionRow {
  category_description_id: number;
  category_description_category_id: number;
  name: string;
  short_description: string | null;
  description: string | null;
  image: string | null;
  meta_title: string | null;
  meta_keywords: string | null;
  meta_description: string | null;
  url_key: string;
}

export type CategoryDescriptionInsert = Omit<
  CategoryDescriptionRow,
  'category_description_id'
>;
export type CategoryDescriptionUpdate = Partial<
  Omit<CategoryDescriptionRow, 'category_description_id'>
>;

// =============================================================================
// CMS PAGE
// =============================================================================

export interface CmsPageRow {
  cms_page_id: number;
  uuid: string;
  status: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export type CmsPageInsert = Omit<
  CmsPageRow,
  'cms_page_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CmsPageUpdate = Partial<Omit<CmsPageRow, 'cms_page_id'>>;

// =============================================================================
// CMS PAGE DESCRIPTION
// =============================================================================

export interface CmsPageDescriptionRow {
  cms_page_description_id: number;
  cms_page_description_cms_page_id: number | null;
  url_key: string;
  name: string;
  content: string | null;
  meta_title: string | null;
  meta_keywords: string | null;
  meta_description: string | null;
}

export type CmsPageDescriptionInsert = Omit<
  CmsPageDescriptionRow,
  'cms_page_description_id'
>;
export type CmsPageDescriptionUpdate = Partial<
  Omit<CmsPageDescriptionRow, 'cms_page_description_id'>
>;

// =============================================================================
// COLLECTION
// =============================================================================

export interface CollectionRow {
  collection_id: number;
  uuid: string;
  name: string;
  description: string | null;
  code: string;
  meta_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type CollectionInsert = Omit<
  CollectionRow,
  'collection_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CollectionUpdate = Partial<Omit<CollectionRow, 'collection_id'>>;

// =============================================================================
// COUPON
// =============================================================================

export interface CouponRow {
  coupon_id: number;
  uuid: string;
  status: boolean;
  description: string;
  discount_amount: string;
  free_shipping: boolean;
  discount_type: string;
  coupon: string;
  used_time: number;
  target_products: Record<string, unknown> | null;
  condition: Record<string, unknown> | null;
  user_condition: Record<string, unknown> | null;
  buyx_gety: Record<string, unknown> | null;
  max_uses_time_per_coupon: number | null;
  max_uses_time_per_customer: number | null;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type CouponInsert = Omit<
  CouponRow,
  'coupon_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CouponUpdate = Partial<Omit<CouponRow, 'coupon_id'>>;

// =============================================================================
// CUSTOMER
// =============================================================================

export interface CustomerRow {
  customer_id: number;
  uuid: string;
  status: number;
  group_id: number | null;
  email: string;
  password: string;
  full_name: string | null;
  meta_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  is_google_login: boolean;
}

export type CustomerInsert = Omit<
  CustomerRow,
  'customer_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CustomerUpdate = Partial<Omit<CustomerRow, 'customer_id'>>;

// =============================================================================
// CUSTOMER ADDRESS
// =============================================================================

export interface CustomerAddressRow {
  customer_address_id: number;
  uuid: string;
  customer_id: number;
  full_name: string | null;
  telephone: string | null;
  address_1: string | null;
  address_2: string | null;
  postcode: string | null;
  city: string | null;
  province: string | null;
  country: string;
  created_at: Date;
  updated_at: Date;
  is_default: boolean | null;
}

export type CustomerAddressInsert = Omit<
  CustomerAddressRow,
  'customer_address_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CustomerAddressUpdate = Partial<
  Omit<CustomerAddressRow, 'customer_address_id'>
>;

// =============================================================================
// CUSTOMER GROUP
// =============================================================================

export interface CustomerGroupRow {
  customer_group_id: number;
  uuid: string;
  group_name: string;
  created_at: Date;
  updated_at: Date;
}

export type CustomerGroupInsert = Omit<
  CustomerGroupRow,
  'customer_group_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type CustomerGroupUpdate = Partial<
  Omit<CustomerGroupRow, 'customer_group_id'>
>;

// =============================================================================
// EVENT
// =============================================================================

export interface EventRow {
  event_id: number;
  uuid: string;
  name: string;
  data: Record<string, unknown> | null;
  created_at: Date;
}

export type EventInsert = Omit<EventRow, 'event_id' | 'uuid' | 'created_at'>;
export type EventUpdate = Partial<Omit<EventRow, 'event_id'>>;

// =============================================================================
// MIGRATION
// =============================================================================

export interface MigrationRow {
  migration_id: number;
  module: string;
  version: string;
  created_at: Date;
  updated_at: Date;
}

export type MigrationInsert = Omit<
  MigrationRow,
  'migration_id' | 'created_at' | 'updated_at'
>;
export type MigrationUpdate = Partial<Omit<MigrationRow, 'migration_id'>>;

// =============================================================================
// ORDER
// =============================================================================

export interface OrderRow {
  order_id: number;
  uuid: string;
  integration_order_id: string | null;
  sid: string | null;
  order_number: string;
  cart_id: number;
  currency: string;
  customer_id: number | null;
  customer_email: string | null;
  customer_full_name: string | null;
  user_ip: string | null;
  user_agent: string | null;
  coupon: string | null;
  shipping_fee_excl_tax: string | null;
  shipping_fee_incl_tax: string | null;
  discount_amount: string | null;
  sub_total: string;
  sub_total_incl_tax: string;
  sub_total_with_discount: string;
  sub_total_with_discount_incl_tax: string;
  total_qty: number;
  total_weight: string | null;
  tax_amount: string;
  tax_amount_before_discount: string;
  shipping_tax_amount: string;
  shipping_note: string | null;
  grand_total: string;
  /**
   * Structured shipping selection snapshot. Same shape as CartRow.shipping_method_data.
   * Backfilled from the legacy varchar columns in Version-1.0.8 migration; new
   * orders write this directly.
   */
  shipping_method_data: Record<string, unknown> | null;
  shipping_address_id: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  billing_address_id: number | null;
  shipment_status: string;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
  total_tax_amount: string | null;
  status: string | null;
  no_shipping_required: boolean;
  meta_data: Record<string, unknown>;
}

export type OrderInsert = Omit<
  OrderRow,
  'order_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type OrderUpdate = Partial<Omit<OrderRow, 'order_id'>>;

// =============================================================================
// ORDER ACTIVITY
// =============================================================================

export interface OrderActivityRow {
  order_activity_id: number;
  uuid: string;
  order_activity_order_id: number;
  comment: string;
  customer_notified: boolean;
  created_at: Date;
  updated_at: Date;
}

export type OrderActivityInsert = Omit<
  OrderActivityRow,
  'order_activity_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type OrderActivityUpdate = Partial<
  Omit<OrderActivityRow, 'order_activity_id'>
>;

// =============================================================================
// ORDER ADDRESS
// =============================================================================

export interface OrderAddressRow {
  order_address_id: number;
  uuid: string;
  full_name: string | null;
  postcode: string | null;
  telephone: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  address_1: string | null;
  address_2: string | null;
}

export type OrderAddressInsert = Omit<
  OrderAddressRow,
  'order_address_id' | 'uuid'
>;
export type OrderAddressUpdate = Partial<
  Omit<OrderAddressRow, 'order_address_id'>
>;

// =============================================================================
// ORDER ITEM
// =============================================================================

export interface OrderItemRow {
  order_item_id: number;
  uuid: string;
  order_item_order_id: number;
  product_id: number;
  referer: number | null;
  product_sku: string;
  product_name: string;
  thumbnail: string | null;
  product_weight: string | null;
  /** Package (parcel) snapshot, frozen at placement (copied from cart_item).
   *  Dims in shop.dimensionUnit; package_weight = TARE in shop.weightUnit.
   *  NULL for legacy/virtual products. */
  package_length: string | null;
  package_width: string | null;
  package_height: string | null;
  package_weight: string | null;
  product_price: string;
  product_price_incl_tax: string;
  qty: number;
  final_price: string;
  final_price_incl_tax: string;
  tax_percent: string;
  tax_amount: string;
  tax_amount_before_discount: string;
  discount_amount: string;
  line_total: string;
  line_total_with_discount: string;
  line_total_incl_tax: string;
  line_total_with_discount_incl_tax: string;
  variant_group_id: number | null;
  variant_options: string | null;
  product_custom_options: string | null;
  requested_data: string | null;
  no_shipping_required: boolean;
}

export type OrderItemInsert = Omit<OrderItemRow, 'order_item_id' | 'uuid'>;
export type OrderItemUpdate = Partial<Omit<OrderItemRow, 'order_item_id'>>;

// =============================================================================
// PAYMENT TRANSACTION
// =============================================================================

export interface PaymentTransactionRow {
  payment_transaction_id: number;
  uuid: string;
  payment_transaction_order_id: number;
  transaction_id: string | null;
  transaction_type: string;
  amount: string;
  parent_transaction_id: string | null;
  payment_action: string | null;
  additional_information: string | null;
  created_at: Date;
}

export type PaymentTransactionInsert = Omit<
  PaymentTransactionRow,
  'payment_transaction_id' | 'uuid' | 'created_at'
>;
export type PaymentTransactionUpdate = Partial<
  Omit<PaymentTransactionRow, 'payment_transaction_id'>
>;

// =============================================================================
// PRODUCT
// =============================================================================

export interface ProductRow {
  product_id: number;
  uuid: string;
  type: string;
  variant_group_id: number | null;
  visibility: boolean;
  group_id: number | null;
  sku: string;
  price: string;
  weight: string | null;
  /** Reference to the `package` table (parcel size). Mandatory for shippable
   *  products at save time; NULL for legacy/virtual products. Variant groups
   *  share one package. */
  package_id: number | null;
  tax_class: number | null;
  status: boolean;
  created_at: Date;
  updated_at: Date;
  category_id: number | null;
  no_shipping_required: boolean;
  meta_data: Record<string, unknown>;
}

export type ProductInsert = Omit<
  ProductRow,
  'product_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type ProductUpdate = Partial<Omit<ProductRow, 'product_id'>>;

// =============================================================================
// PRODUCT ATTRIBUTE VALUE INDEX
// =============================================================================

export interface ProductAttributeValueIndexRow {
  product_attribute_value_index_id: number;
  product_id: number;
  attribute_id: number;
  option_id: number | null;
  option_text: string | null;
}

export type ProductAttributeValueIndexInsert = Omit<
  ProductAttributeValueIndexRow,
  'product_attribute_value_index_id'
>;
export type ProductAttributeValueIndexUpdate = Partial<
  Omit<ProductAttributeValueIndexRow, 'product_attribute_value_index_id'>
>;

// =============================================================================
// PRODUCT CATEGORY (Junction Table)
// =============================================================================

export interface ProductCategoryRow {
  product_category_id: number;
  category_id: number;
  product_id: number;
}

export type ProductCategoryInsert = Omit<
  ProductCategoryRow,
  'product_category_id'
>;
export type ProductCategoryUpdate = Partial<
  Omit<ProductCategoryRow, 'product_category_id'>
>;

// =============================================================================
// PRODUCT COLLECTION (Junction Table)
// =============================================================================

export interface ProductCollectionRow {
  product_collection_id: number;
  collection_id: number;
  product_id: number;
}

export type ProductCollectionInsert = Omit<
  ProductCollectionRow,
  'product_collection_id'
>;
export type ProductCollectionUpdate = Partial<
  Omit<ProductCollectionRow, 'product_collection_id'>
>;

// =============================================================================
// PRODUCT CUSTOM OPTION
// =============================================================================

export interface ProductCustomOptionRow {
  product_custom_option_id: number;
  uuid: string;
  product_custom_option_product_id: number;
  option_name: string;
  option_type: string;
  is_required: boolean;
  sort_order: number | null;
}

export type ProductCustomOptionInsert = Omit<
  ProductCustomOptionRow,
  'product_custom_option_id' | 'uuid'
>;
export type ProductCustomOptionUpdate = Partial<
  Omit<ProductCustomOptionRow, 'product_custom_option_id'>
>;

// =============================================================================
// PRODUCT CUSTOM OPTION VALUE
// =============================================================================

export interface ProductCustomOptionValueRow {
  product_custom_option_value_id: number;
  uuid: string;
  option_id: number;
  extra_price: string | null;
  sort_order: number | null;
  value: string;
}

export type ProductCustomOptionValueInsert = Omit<
  ProductCustomOptionValueRow,
  'product_custom_option_value_id' | 'uuid'
>;
export type ProductCustomOptionValueUpdate = Partial<
  Omit<ProductCustomOptionValueRow, 'product_custom_option_value_id'>
>;

// =============================================================================
// PRODUCT DESCRIPTION
// =============================================================================

export interface ProductDescriptionRow {
  product_description_id: number;
  product_description_product_id: number;
  name: string;
  description: string | null;
  short_description: string | null;
  url_key: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
}

export type ProductDescriptionInsert = Omit<
  ProductDescriptionRow,
  'product_description_id'
>;
export type ProductDescriptionUpdate = Partial<
  Omit<ProductDescriptionRow, 'product_description_id'>
>;

// =============================================================================
// PRODUCT IMAGE
// =============================================================================

export interface ProductImageRow {
  product_image_id: number;
  product_image_product_id: number;
  origin_image: string;
  thumb_image: string | null;
  listing_image: string | null;
  single_image: string | null;
  is_main: boolean;
}

export type ProductImageInsert = Omit<ProductImageRow, 'product_image_id'>;
export type ProductImageUpdate = Partial<
  Omit<ProductImageRow, 'product_image_id'>
>;

// =============================================================================
// PRODUCT INVENTORY
// =============================================================================

export interface ProductInventoryRow {
  product_inventory_id: number;
  product_inventory_product_id: number;
  qty: number;
  manage_stock: boolean;
  stock_availability: boolean;
}

export type ProductInventoryInsert = Omit<
  ProductInventoryRow,
  'product_inventory_id'
>;
export type ProductInventoryUpdate = Partial<
  Omit<ProductInventoryRow, 'product_inventory_id'>
>;

// =============================================================================
// RESET PASSWORD TOKEN
// =============================================================================

export interface ResetPasswordTokenRow {
  reset_password_token_id: number;
  customer_id: number;
  token: string;
  created_at: Date;
}

export type ResetPasswordTokenInsert = Omit<
  ResetPasswordTokenRow,
  'reset_password_token_id' | 'created_at'
>;
export type ResetPasswordTokenUpdate = Partial<
  Omit<ResetPasswordTokenRow, 'reset_password_token_id'>
>;

// =============================================================================
// SESSION
// =============================================================================

export interface SessionRow {
  sid: string;
  sess: Record<string, unknown>;
  expire: Date;
}

export type SessionInsert = SessionRow;
export type SessionUpdate = Partial<Omit<SessionRow, 'sid'>>;

// =============================================================================
// SETTING
// =============================================================================

export interface SettingRow {
  setting_id: number;
  uuid: string;
  name: string;
  value: string | null;
  is_json: boolean;
}

export type SettingInsert = Omit<SettingRow, 'setting_id' | 'uuid'>;
export type SettingUpdate = Partial<Omit<SettingRow, 'setting_id'>>;

// =============================================================================
// SHIPMENT
// =============================================================================

export interface ShipmentRow {
  shipment_id: number;
  uuid: string;
  shipment_order_id: number;
  carrier: string | null;
  tracking_number: string | null;
  /**
   * Registered status code (e.g. 'pending', 'shipped', 'delivered', 'canceled',
   * or any extension-registered code). Phase is derived at read time from the
   * status registration — `getShipmentStatusList()[row.status].phase`.
   */
  status: string;
  /** First-occurrence timestamp; set when the shipment first enters the `shipped` phase. */
  shipped_at: Date | null;
  /** First-occurrence timestamp; set when the shipment first enters the `delivered` phase. */
  delivered_at: Date | null;
  /** First-occurrence timestamp; set when the shipment first enters the `canceled` phase. */
  canceled_at: Date | null;
  /**
   * Carrier-hosted label URL set after a successful `createLabel` purchase.
   * Stored as a URL (never the binary). Null when admin chose "I already have
   * a tracking number" or when no label has been generated yet.
   */
  label_url: string | null;
  /**
   * Label file MIME — e.g. `application/pdf`, `image/png`, `application/zpl`.
   * Populated by the carrier provider alongside `label_url`.
   */
  label_format: string | null;
  /**
   * Carrier's internal id for the shipment from `LabelResult.carrierShipmentId`
   * (e.g. UPS's `ShipmentIdentificationNumber`). Distinct from the
   * customer-visible `tracking_number` — UPS requires it to void or query
   * the shipment, and the tracking number alone is not enough. Passed back
   * to the carrier via `CarrierMethodContext.carrierShipmentId`. Null when
   * the carrier doesn't return one (regional couriers, "Custom / Other").
   */
  carrier_shipment_id: string | null;
  /**
   * Aggregator-extension blob from `LabelResult.metadata`. Shippo / EasyPost
   * use this to record `{ underlyingCarrier, rateId, ... }` so subsequent
   * calls (`fetchStatus`, `voidLabel`, `generateTrackingUrl`) can route
   * without a private side table. Opaque to core; passed back verbatim via
   * `CarrierMethodContext.metadata`. Null when the carrier didn't write any.
   */
  carrier_metadata: Record<string, unknown> | null;
  /**
   * Public tracking URL handed back by the carrier at label-purchase time
   * (Shippo's `tracking_url_provider`, EasyPost's `public_url`). Set from
   * `LabelResult.trackingUrl` inside `createShipment`. The
   * `Shipment.trackingUrl` resolver returns this verbatim when set;
   * otherwise it falls through to `Carrier.generateTrackingUrl(ctx)`.
   * Null for single-carrier extensions that compose the URL on the fly.
   */
  tracking_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export type ShipmentInsert = Omit<
  ShipmentRow,
  'shipment_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type ShipmentUpdate = Partial<Omit<ShipmentRow, 'shipment_id'>>;

// =============================================================================
// SHIPMENT ITEM
// =============================================================================

/**
 * Junction row binding a shipment to one of its order's items, with the qty
 * being shipped in that shipment. UNIQUE on (shipment_id, order_item_id) — one
 * row per pair. Digital items (`order_item.no_shipping_required = true`) never
 * appear here.
 *
 * See wiki/multi-shipment-design.md → "Schema" → "New table".
 */
export interface ShipmentItemRow {
  shipment_item_id: number;
  uuid: string;
  shipment_id: number;
  order_item_id: number;
  qty: number;
  created_at: Date;
}

export type ShipmentItemInsert = Omit<
  ShipmentItemRow,
  'shipment_item_id' | 'uuid' | 'created_at'
>;
export type ShipmentItemUpdate = Partial<
  Omit<ShipmentItemRow, 'shipment_item_id'>
>;

// =============================================================================
// SHIPPING ZONE
// =============================================================================

export interface ShippingZoneRow {
  shipping_zone_id: number;
  uuid: string;
  name: string;
}

export type ShippingZoneInsert = Omit<
  ShippingZoneRow,
  'shipping_zone_id' | 'uuid'
>;
export type ShippingZoneUpdate = Partial<
  Omit<ShippingZoneRow, 'shipping_zone_id'>
>;

// =============================================================================
// SHIPPING ZONE PROVINCE
// =============================================================================

export interface ShippingZoneProvinceRow {
  shipping_zone_province_id: number;
  uuid: string;
  zone_id: number;
  /**
   * ISO country code. Added in Version-1.0.8 so province codes disambiguate
   * when a zone covers multiple countries (e.g., "CA" → California in US,
   * Catalonia in ES). Backfilled from each row's parent zone.
   */
  country: string;
  province: string;
}

export type ShippingZoneProvinceInsert = Omit<
  ShippingZoneProvinceRow,
  'shipping_zone_province_id' | 'uuid'
>;
export type ShippingZoneProvinceUpdate = Partial<
  Omit<ShippingZoneProvinceRow, 'shipping_zone_province_id'>
>;

// =============================================================================
// SHIPPING ZONE PROVIDER (platform-level — zone→registered-provider attachment)
// =============================================================================
//
// There is no `shipping_provider` row type. Provider definitions live in the
// in-memory registry (`services/shipping/registry.ts`), populated at bootstrap
// by every provider extension's `registerShippingProvider(...)` call. The
// attachment row references the registry by `provider_code` — a soft string
// reference, not a FK. Orphan attachments to uninstalled providers are
// filtered at checkout via `getShippingProvider(code)` returning undefined.

export interface ShippingZoneProviderRow {
  shipping_zone_provider_id: number;
  uuid: string;
  zone_id: number;
  /** Soft reference to a registered provider's `Carrier`-like `code`. */
  provider_code: string;
  is_enabled: boolean;
  /** Per-zone provider config; shape declared by provider.zoneConfigFields. */
  config: Record<string, unknown>;
  sort_order: number;
}

export type ShippingZoneProviderInsert = Omit<
  ShippingZoneProviderRow,
  'shipping_zone_provider_id' | 'uuid'
>;
export type ShippingZoneProviderUpdate = Partial<
  Omit<ShippingZoneProviderRow, 'shipping_zone_provider_id'>
>;

// =============================================================================
// SHIPPING ZONE COUNTRY (platform-level — multi-country junction)
// =============================================================================

export interface ShippingZoneCountryRow {
  shipping_zone_country_id: number;
  uuid: string;
  zone_id: number;
  country: string;
}

export type ShippingZoneCountryInsert = Omit<
  ShippingZoneCountryRow,
  'shipping_zone_country_id' | 'uuid'
>;
export type ShippingZoneCountryUpdate = Partial<
  Omit<ShippingZoneCountryRow, 'shipping_zone_country_id'>
>;

// =============================================================================
// CORE SHIPPING METHOD (Core-provider-internal — global method list)
// =============================================================================

export interface CoreShippingMethodRow {
  core_shipping_method_id: number;
  uuid: string;
  name: string;
  is_enabled: boolean;
  sort_order: number;
  /**
   * Merchant-chosen default carrier for this method (a `carrier.code`).
   * Written into `shipping_method_data.snapshot.carrier` at checkout as a
   * fulfillment hint — never customer-facing. NewShipmentDialog uses it to
   * pre-select the carrier dropdown when admin opens the ship dialog.
   */
  default_carrier_code: string | null;
  /**
   * Merchant-chosen default service code in the carrier's vocabulary
   * (`FEDEX_GROUND`, `usps_priority`, ...). Written into
   * `shipping_method_data.snapshot.serviceCode` at checkout, then read by
   * `createShipment.buildCreateLabelInput` and threaded to
   * `CreateLabelInput.serviceCode` so the carrier prints the exact service
   * the customer paid for instead of falling through to its own default.
   * Free-form varchar — service codes are carrier-specific and core does
   * not validate them.
   */
  default_service_code: string | null;
}

export type CoreShippingMethodInsert = Omit<
  CoreShippingMethodRow,
  'core_shipping_method_id' | 'uuid'
>;
export type CoreShippingMethodUpdate = Partial<
  Omit<CoreShippingMethodRow, 'core_shipping_method_id'>
>;

// =============================================================================
// CORE SHIPPING METHOD RATE (Core-provider-internal — per-zone rate/condition)
// =============================================================================

export interface CoreShippingMethodRateRow {
  core_shipping_method_rate_id: number;
  uuid: string;
  method_id: number;
  zone_id: number;
  is_enabled: boolean;
  cost: string | null;
  /** 'price' | 'weight' | null */
  condition_type: string | null;
  min: string | null;
  max: string | null;
  price_based_cost: Record<string, unknown> | null;
  weight_based_cost: Record<string, unknown> | null;
}

export type CoreShippingMethodRateInsert = Omit<
  CoreShippingMethodRateRow,
  'core_shipping_method_rate_id' | 'uuid'
>;
export type CoreShippingMethodRateUpdate = Partial<
  Omit<CoreShippingMethodRateRow, 'core_shipping_method_rate_id'>
>;

// =============================================================================
// TAX CLASS
// =============================================================================

export interface TaxClassRow {
  tax_class_id: number;
  uuid: string;
  name: string;
}

export type TaxClassInsert = Omit<TaxClassRow, 'tax_class_id' | 'uuid'>;
export type TaxClassUpdate = Partial<Omit<TaxClassRow, 'tax_class_id'>>;

// =============================================================================
// TAX RATE
// =============================================================================

export interface TaxRateRow {
  tax_rate_id: number;
  uuid: string;
  name: string;
  tax_class_id: number | null;
  country: string;
  province: string;
  postcode: string;
  rate: string;
  is_compound: boolean;
  priority: number;
}

export type TaxRateInsert = Omit<TaxRateRow, 'tax_rate_id' | 'uuid'>;
export type TaxRateUpdate = Partial<Omit<TaxRateRow, 'tax_rate_id'>>;

// =============================================================================
// URL REWRITE
// =============================================================================

export interface UrlRewriteRow {
  url_rewrite_id: number;
  language: string;
  request_path: string;
  target_path: string;
  entity_uuid: string | null;
  entity_type: string | null;
}

export type UrlRewriteInsert = Omit<UrlRewriteRow, 'url_rewrite_id'>;
export type UrlRewriteUpdate = Partial<Omit<UrlRewriteRow, 'url_rewrite_id'>>;

// =============================================================================
// VARIANT GROUP
// =============================================================================

export interface VariantGroupRow {
  variant_group_id: number;
  uuid: string;
  attribute_group_id: number;
  attribute_one: number | null;
  attribute_two: number | null;
  attribute_three: number | null;
  attribute_four: number | null;
  attribute_five: number | null;
  visibility: boolean;
}

export type VariantGroupInsert = Omit<
  VariantGroupRow,
  'variant_group_id' | 'uuid'
>;
export type VariantGroupUpdate = Partial<
  Omit<VariantGroupRow, 'variant_group_id'>
>;

// =============================================================================
// WIDGET (renamed in cms migration 1.3.0: widget → widget_instance)
// =============================================================================

export interface WidgetInstanceRow {
  widget_instance_id: number;
  uuid: string;
  name: string;
  type: string;
  settings: Record<string, unknown>;
  status: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export type WidgetInstanceInsert = Omit<
  WidgetInstanceRow,
  'widget_instance_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type WidgetInstanceUpdate = Partial<
  Omit<WidgetInstanceRow, 'widget_instance_id'>
>;

/**
 * @deprecated since cms migration 1.3.0 — use `WidgetInstanceRow`. Kept as an
 * alias so older imports keep compiling during the transition.
 */
export type WidgetRow = WidgetInstanceRow;

export interface WidgetPlacementRow {
  widget_placement_id: number;
  uuid: string;
  widget_instance_id: number;
  route: string;
  area: string;
  sort_order: number;
  // entity_urn: nullable. Set for entity-level placements (e.g. CMS page
  // overrides). Null for route-level placements.
  entity_urn: string | null;
  created_at: Date;
  updated_at: Date;
}

export type WidgetPlacementInsert = Omit<
  WidgetPlacementRow,
  'widget_placement_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type WidgetPlacementUpdate = Partial<
  Omit<WidgetPlacementRow, 'widget_placement_id'>
>;

// =============================================================================
// PAGE BUILDER (introduced in pageBuilder migration 1.0.0)
// =============================================================================

export interface ChangesetRow {
  changeset_id: number;
  uuid: string;
  name: string;
  token: string;
  published_at: Date | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export type ChangesetInsert = Omit<
  ChangesetRow,
  'changeset_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type ChangesetUpdate = Partial<Omit<ChangesetRow, 'changeset_id'>>;

export interface ChangesetOperationRow {
  changeset_operation_id: number;
  uuid: string;
  changeset_id: number;
  route: string;
  entity_urn: string;
  // Either or both can be null; (null, set) = INSERT, (set, set) = UPDATE,
  // (set, null) = DELETE. (null, null) is invalid and rejected at API layer.
  old_payload: Record<string, unknown> | null;
  new_payload: Record<string, unknown> | null;
  change_order: number;
  created_at: Date;
}

export type ChangesetOperationInsert = Omit<
  ChangesetOperationRow,
  'changeset_operation_id' | 'uuid' | 'created_at'
>;

export interface RolloutPlanRow {
  rollout_plan_id: number;
  uuid: string;
  name: string;
  changeset_id: number;
  // Snapshot of changeset.route_cursors at Save time. Storefront overlay reads
  // this (not the live changeset cursors) so that in-progress edits in the
  // editor don't leak to the live storefront until the user explicitly Saves.
  route_cursors: Record<string, number>;
  start_time: Date;
  end_time: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type RolloutPlanInsert = Omit<
  RolloutPlanRow,
  'rollout_plan_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type RolloutPlanUpdate = Partial<Omit<RolloutPlanRow, 'rollout_plan_id'>>;

// =============================================================================
// SITE (Cloud specific - may not exist in all installations)
// =============================================================================

export interface SiteRow {
  site_id: number;
  uuid: string;
  order_id: number;
  user_id: number;
  name: string;
  type: string;
  domain: string;
  configuration: Record<string, unknown> | null;
  db_name: string;
  db_username: string;
  db_password: string;
  admin_email: string;
  admin_password: string | null;
  github_installation_id: string | null;
  github_repository: string | null;
  github_branch: string | null;
  version: string | null;
  created_at: Date;
  updated_at: Date;
}

export type SiteInsert = Omit<
  SiteRow,
  'site_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type SiteUpdate = Partial<Omit<SiteRow, 'site_id'>>;

// =============================================================================
// QUERY BUILDER RESULT TYPES
// =============================================================================

/**
 * Result type from insert operations via postgres-query-builder
 */
export interface InsertResult<T = Record<string, unknown>> {
  insertId: number;
  [key: string]: unknown;
}

/**
 * Result type from update operations via postgres-query-builder
 */
export interface UpdateResult {
  rowCount: number;
}

/**
 * Helper type for creating insert results that include all row data
 */
export type InsertResultWithRow<T> = T & { insertId: number };
