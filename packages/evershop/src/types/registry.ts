import type { PurchaseUnit } from '@paypal/paypal-js';
import type { AnySchemaObject } from 'ajv';
import type { EmailData, SendEmailArguments } from '../lib/mail/emailHelper.js';
import type { AttributeData as CreateAttributeData } from '../modules/catalog/services/attribute/createProductAttribute.js';
import type { AttributeData as UpdateAttributeData } from '../modules/catalog/services/attribute/updateProductAttribute.js';
import type { CategoryData } from '../modules/catalog/services/category/createCategory.js';
import type { CollectionData } from '../modules/catalog/services/collection/createCollection.js';
import type { ProductData } from '../modules/catalog/services/product/createProduct.js';
import type { WidgetData } from '../modules/cms/services/widget/createWidget.js';
import type { CustomerData } from '../modules/customer/services/customer/createCustomer.js';
import type { CouponData } from '../modules/promotion/services/coupon/createCoupon.js';
import type { ShippingProvider } from './shippingProvider.js';

/**
 * Registry that maps value names to their data types.
 * Extend this interface in your module to register custom values.
 *
 * @example
 * ```typescript
 * // In your module's bootstrap or type declaration file
 * declare module '@evershop/evershop/types/registry' {
 *   interface ValueRegistry {
 *     'myCustomValue': MyDataType;
 *   }
 * }
 * ```
 */
export interface ValueRegistry {
  // ── Catalog: Product ──────────────────────────────────────────────────────

  /** Product input data before the create transaction runs */
  productDataBeforeCreate: ProductData;
  /** Product input data before the update transaction runs */
  productDataBeforeUpdate: ProductData;
  /** AJV JSON schema used to validate product data on create */
  createProductDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate product data on update */
  updateProductDataJsonSchema: AnySchemaObject;

  // ── Catalog: Category ─────────────────────────────────────────────────────

  /** Category input data before the create transaction runs */
  categoryDataBeforeCreate: CategoryData;
  /** Category input data before the update transaction runs */
  categoryDataBeforeUpdate: CategoryData;
  /** AJV JSON schema used to validate category data on create */
  createCategoryDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate category data on update */
  updateCategoryDataJsonSchema: AnySchemaObject;

  // ── Catalog: Attribute ────────────────────────────────────────────────────

  /** Product attribute input data before the create transaction runs */
  attributeDataBeforeCreate: CreateAttributeData;
  /** Product attribute input data before the update transaction runs */
  attributeDataBeforeUpdate: UpdateAttributeData;
  /** AJV JSON schema used to validate attribute data on create */
  createAttributeDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate attribute data on update */
  updateAttributeDataJsonSchema: AnySchemaObject;

  // ── Catalog: Collection ───────────────────────────────────────────────────

  /** Collection input data before the update transaction runs */
  collectionDataBeforeUpdate: CollectionData;

  // ── Promotion: Coupon ─────────────────────────────────────────────────────

  /** Coupon input data before the create transaction runs */
  couponDataBeforeCreate: CouponData;
  /** Coupon input data before the update transaction runs */
  couponDataBeforeUpdate: Partial<CouponData>;
  /** AJV JSON schema used to validate coupon data on create */
  createCouponDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate coupon data on update */
  updateCouponDataJsonSchema: AnySchemaObject;

  // ── Customer ──────────────────────────────────────────────────────────────

  /** Customer input data before the update transaction runs */
  customerDataBeforeUpdate: CustomerData;
  /** AJV JSON schema used to validate customer data on create */
  createCustomerDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate customer data on update */
  updateCustomerDataJsonSchema: AnySchemaObject;

  // ── CMS: Page ─────────────────────────────────────────────────────────────

  /** CMS page input data before the create transaction runs */
  pageDataBeforeCreate: Record<string, unknown>;
  /** CMS page input data before the update transaction runs */
  pageDataBeforeUpdate: Record<string, unknown>;
  /** AJV JSON schema used to validate page data on create */
  createPageDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate page data on update */
  updatePageDataJsonSchema: AnySchemaObject;

  // ── CMS: Widget ───────────────────────────────────────────────────────────

  /** Widget input data before the create transaction runs */
  widgetDataBeforeCreate: WidgetData;
  /** Widget input data before the update transaction runs */
  widgetDataBeforeUpdate: WidgetData;
  /** AJV JSON schema used to validate widget data on create */
  createWidgetDataJsonSchema: AnySchemaObject;
  /** AJV JSON schema used to validate widget data on update */
  updateWidgetDataJsonSchema: AnySchemaObject;

  // ── OMS ───────────────────────────────────────────────────────────────────

  /**
   * Payment+shipment status → order status mapping.
   * Keys are `"paymentStatus:shipmentStatus"` strings; values are order status strings.
   */
  psoMapping: Record<string, string>;

  // ── Email ─────────────────────────────────────────────────────────────────

  /** Arguments passed to the email service before every `sendEmail` call */
  emailArguments: SendEmailArguments;
  /** Template data passed to every email template renderer */
  emailTemplateData: EmailData;

  /** Dynamic data injected into the order confirmation email */
  orderConfirmationEmailData: EmailData;
  /** Send-email arguments for the order confirmation email */
  orderConfirmationEmailArguments: SendEmailArguments;

  /** Dynamic data injected into the reset-password email */
  resetPasswordEmailData: EmailData;
  /** Send-email arguments for the reset-password email */
  resetPasswordEmailArguments: SendEmailArguments;

  /** Dynamic data injected into the customer welcome email */
  customerWelcomeEmailData: EmailData;
  /** Send-email arguments for the customer welcome email */
  customerWelcomeEmailArguments: SendEmailArguments;

  // ── Checkout ──────────────────────────────────────────────────────────────

  /**
   * Cart `Item` instance before it is added to the cart.
   * `Item` is implemented in JavaScript; cast to access specific members.
   */
  cartItemBeforeAdd: unknown;

  // ── Shipping ──────────────────────────────────────────────────────────────

  /**
   * Registered shipping providers. Populated at bootstrap via
   * `registerShippingProvider`; read at runtime by the listing resolver and
   * the cart's `shipping_method_data` field resolver.
   */
  shippingProviders: ShippingProvider[];

  // ── PayPal ────────────────────────────────────────────────────────────────

  /** PayPal purchase-unit amount object before it is sent to the PayPal Orders API */
  paypalFinalAmount: PurchaseUnit['amount'];
}

/**
 * Extract value names from the registry.
 */
export type ValueName = keyof ValueRegistry;

/**
 * Get the data type for a specific registry value.
 */
export type ValueData<K extends ValueName> = ValueRegistry[K];
