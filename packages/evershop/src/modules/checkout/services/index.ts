export { Cart, Item } from './cart/Cart.js';
export * from './getMyCart.js';
export * from './createNewCart.js';
export * from './getCartByUUID.js';
export * from './getAvailablePaymentMethods.js';
export * from './saveCart.js';
export * from './toPrice.js';
export * from './orderCreator.js';
export * from './orderValidator.js';
export * from './addShippingAddress.js';
export * from './addBillingAddress.js';
export * from './checkout.js';
export * from './setShippingMethod.js';
export {
  default as removeCartItem,
  hookBeforeRemoveCartItem,
  hookAfterRemoveCartItem
} from './removeCartItem.js';
export {
  default as updateCartItemQty,
  hookBeforeUpdateCartItemQty,
  hookAfterUpdateCartItemQty
} from './updateCartItemQty.js';
export {
  default as addCartItem,
  hookBeforeAddCartItem,
  hookAfterAddCartItem
} from './addCartItem.js';

// Shipping provider registry — public API for module extensions.
export {
  registerShippingProvider,
  getShippingProvider,
  getAllShippingProviders
} from './shipping/registry.js';

// Core provider rate CRUD — hookable services behind the admin REST endpoints.
export {
  default as createCoreShippingRate,
  hookBeforeCreateCoreShippingRate,
  hookAfterCreateCoreShippingRate
} from './shipping/core/createCoreShippingRate.js';
export type {
  CoreShippingRateData,
  CreateCoreShippingRateInput
} from './shipping/core/createCoreShippingRate.js';
export {
  default as updateCoreShippingRate,
  hookBeforeUpdateCoreShippingRate,
  hookAfterUpdateCoreShippingRate
} from './shipping/core/updateCoreShippingRate.js';
export {
  default as deleteCoreShippingRate,
  hookBeforeDeleteCoreShippingRate,
  hookAfterDeleteCoreShippingRate
} from './shipping/core/deleteCoreShippingRate.js';

// Helpers used by phase 3+ (cart resolver, orchestrator, REST endpoints).
export { buildShippingContext } from './shipping/buildShippingContext.js';
export {
  computeFingerprintFromCart,
  computeFingerprintFromCtx
} from './shipping/computeFingerprint.js';
export { getOriginAddress } from './shipping/getOriginAddress.js';
export { resolveZonesForAddress } from './shipping/resolveZonesForAddress.js';
export {
  resolveShippingQuote,
  ShippingQuoteError
} from './shipping/resolveShippingQuote.js';
export { serializeItems } from './shipping/serializeItems.js';
