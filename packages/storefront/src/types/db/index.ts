/**
 * ============================================================================
 * STOREFRONT DATABASE TYPES
 * ============================================================================
 *
 * This file contains TypeScript type definitions for all database tables.
 * These types are auto-generated from the PostgreSQL schema and should be
 * used throughout the codebase for type safety.
 *
 * Usage:
 *   import type { OrderRow, ProductRow } from '@storefront/core/src/types/db';
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
  shipping_fee_excl_tax: number | null;
  shipping_fee_incl_tax: number | null;
  discount_amount: number | null;
  sub_total: number;
  sub_total_incl_tax: number;
  sub_total_with_discount: number;
  sub_total_with_discount_incl_tax: number;
  total_qty: number;
  total_weight: number | null;
  tax_amount: number;
  tax_amount_before_discount: number;
  shipping_tax_amount: number;
  grand_total: number;
  shipping_method: string | null;
  shipping_method_name: string | null;
  shipping_zone_id: number | null;
  shipping_address_id: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  billing_address_id: number | null;
  shipping_note: string | null;
  created_at: Date;
  updated_at: Date;
  total_tax_amount: number | null;
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
  product_weight: number | null;
  product_price: number;
  product_price_incl_tax: number;
  qty: number;
  final_price: number;
  final_price_incl_tax: number;
  tax_percent: number;
  tax_amount: number;
  tax_amount_before_discount: number;
  discount_amount: number;
  line_total: number;
  line_total_with_discount: number;
  line_total_incl_tax: number;
  line_total_with_discount_incl_tax: number;
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
  discount_amount: number;
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
  shipping_fee_excl_tax: number | null;
  shipping_fee_incl_tax: number | null;
  discount_amount: number | null;
  sub_total: number;
  sub_total_incl_tax: number;
  sub_total_with_discount: number;
  sub_total_with_discount_incl_tax: number;
  total_qty: number;
  total_weight: number | null;
  tax_amount: number;
  tax_amount_before_discount: number;
  shipping_tax_amount: number;
  shipping_note: string | null;
  grand_total: number;
  shipping_method: string | null;
  shipping_method_name: string | null;
  shipping_address_id: number | null;
  payment_method: string | null;
  payment_method_name: string | null;
  billing_address_id: number | null;
  shipment_status: string;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
  total_tax_amount: number | null;
  status: string | null;
  no_shipping_required: boolean;
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
  product_weight: number | null;
  product_price: number;
  product_price_incl_tax: number;
  qty: number;
  final_price: number;
  final_price_incl_tax: number;
  tax_percent: number;
  tax_amount: number;
  tax_amount_before_discount: number;
  discount_amount: number;
  line_total: number;
  line_total_with_discount: number;
  line_total_incl_tax: number;
  line_total_with_discount_incl_tax: number;
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
  amount: number;
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
  price: number;
  weight: number | null;
  tax_class: number | null;
  status: boolean;
  created_at: Date;
  updated_at: Date;
  category_id: number | null;
  no_shipping_required: boolean;
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
  extra_price: number | null;
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
  created_at: Date;
  updated_at: Date;
}

export type ShipmentInsert = Omit<
  ShipmentRow,
  'shipment_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type ShipmentUpdate = Partial<Omit<ShipmentRow, 'shipment_id'>>;

// =============================================================================
// SHIPPING METHOD
// =============================================================================

export interface ShippingMethodRow {
  shipping_method_id: number;
  uuid: string;
  name: string;
}

export type ShippingMethodInsert = Omit<
  ShippingMethodRow,
  'shipping_method_id' | 'uuid'
>;
export type ShippingMethodUpdate = Partial<
  Omit<ShippingMethodRow, 'shipping_method_id'>
>;

// =============================================================================
// SHIPPING ZONE
// =============================================================================

export interface ShippingZoneRow {
  shipping_zone_id: number;
  uuid: string;
  name: string;
  country: string;
}

export type ShippingZoneInsert = Omit<
  ShippingZoneRow,
  'shipping_zone_id' | 'uuid'
>;
export type ShippingZoneUpdate = Partial<
  Omit<ShippingZoneRow, 'shipping_zone_id'>
>;

// =============================================================================
// SHIPPING ZONE METHOD
// =============================================================================

export interface ShippingZoneMethodRow {
  shipping_zone_method_id: number;
  method_id: number;
  zone_id: number;
  is_enabled: boolean;
  cost: number | null;
  calculate_api: string | null;
  condition_type: string | null;
  max: number | null;
  min: number | null;
  price_based_cost: Record<string, unknown> | null;
  weight_based_cost: Record<string, unknown> | null;
}

export type ShippingZoneMethodInsert = Omit<
  ShippingZoneMethodRow,
  'shipping_zone_method_id'
>;
export type ShippingZoneMethodUpdate = Partial<
  Omit<ShippingZoneMethodRow, 'shipping_zone_method_id'>
>;

// =============================================================================
// SHIPPING ZONE PROVINCE
// =============================================================================

export interface ShippingZoneProvinceRow {
  shipping_zone_province_id: number;
  uuid: string;
  zone_id: number;
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
  rate: number;
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
// WIDGET
// =============================================================================

export interface WidgetRow {
  widget_id: number;
  uuid: string;
  name: string;
  type: string;
  route: Record<string, unknown>[];
  area: Record<string, unknown>[];
  sort_order: number;
  settings: Record<string, unknown>;
  status: boolean | null;
  created_at: Date;
  updated_at: Date;
}

export type WidgetInsert = Omit<
  WidgetRow,
  'widget_id' | 'uuid' | 'created_at' | 'updated_at'
>;
export type WidgetUpdate = Partial<Omit<WidgetRow, 'widget_id'>>;

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
