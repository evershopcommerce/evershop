import addOrderActivityLog from './addOrderActivityLog.js';
import cancelOrder from './cancelOrder.js';
import createShipment from './createShipment.js';
import markDelivered from './markDelivered.js';
export * from './orderMetafield.js';
export {
  voidShipmentLabel,
  hookBeforeVoidShipmentLabel,
  hookAfterVoidShipmentLabel
} from './voidShipmentLabel.js';
export {
  updateShipmentStatusFromCarrier,
  hookBeforeUpdateShipmentStatusFromCarrier,
  hookAfterUpdateShipmentStatusFromCarrier
} from './updateShipmentStatusFromCarrier.js';
export type { CarrierStatusMeta } from './updateShipmentStatusFromCarrier.js';
export * from './updatePaymentStatus.js';
export * from './updateShipmentStatus.js';
export * from './orderLoader.js';
export * from './addPaymentTransaction.js';
export * from './statusManager.js';
export * from './updateOrderStatus.js';
export {
  cancelOrder,
  addOrderActivityLog,
  createShipment,
  markDelivered
};

// Multi-shipment refactor — new public surface.
// See wiki/multi-shipment-design.md → "Public exports for extensions".
export type { ShipmentPhase } from '../types/shipmentPhase.js';
export type { OrderShipmentRollup } from '../types/orderShipmentRollup.js';
export { ROLLUP_DISPLAY, getRollupDisplay } from './rollupDisplay.js';
export { CANONICAL_SHIPMENT_STATUSES } from './canonicalShipmentStatuses.js';

// Shipment reads + rollup.
export {
  getShipmentsForOrder,
  getUnshippedItems,
  getOrderShipmentRollup
} from './shipment/reads.js';
export {
  resolveShipmentRollupForOrder,
  aggregateRollupStats,
  hookBeforeResolveShipmentRollup,
  hookAfterResolveShipmentRollup
} from './shipment/resolveShipmentRollup.js';

// Order shipment_status recompute + the changeShipmentStatus hook target.
export {
  recomputeOrderShipmentStatus,
  hookBeforeRecomputeOrderShipmentStatus,
  hookAfterRecomputeOrderShipmentStatus,
  hookBeforeChangeShipmentStatus,
  hookAfterChangeShipmentStatus
} from './recomputeOrderShipmentStatus.js';

// Carrier registry (C2).
export {
  registerCarrier,
  getCarrier,
  getAllCarriers
} from './carrier/registry.js';
export type {
  Carrier,
  CarrierAddress,
  CarrierCapabilities,
  CarrierItem,
  CarrierMethodContext,
  CreateLabelInput,
  Dimensions,
  LabelResult,
  Parcel,
  PickupRequest,
  PickupResult,
  TrackingResult,
  Weight
} from '../types/carrier.js';

// createShipment + markDelivered hook helpers.
export {
  hookBeforeCreateShipment,
  hookAfterCreateShipment,
  hookBeforeValidateShipmentItems,
  hookAfterValidateShipmentItems,
  hookBeforeInsertShipment,
  hookAfterInsertShipment,
  hookBeforeInsertShipmentItems,
  hookAfterInsertShipmentItems
} from './createShipment.js';
export {
  hookBeforeMarkDelivered,
  hookAfterMarkDelivered
} from './markDelivered.js';
