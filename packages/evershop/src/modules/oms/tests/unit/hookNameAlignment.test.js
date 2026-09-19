process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import markDelivered from '../../services/markDelivered.js';
import { createShipmentNew } from '../../services/createShipment.js';
import { updateShipmentStatus } from '../../services/updateShipmentStatus.js';
import { updateShipmentStatusFromCarrier } from '../../services/updateShipmentStatusFromCarrier.js';
import { voidShipmentLabel } from '../../services/voidShipmentLabel.js';

/**
 * `hookable()` keys before/after hooks by the WRAPPED function's `.name`
 * (hookable.ts → `funcName = originalFunction.name`). If a service wraps a
 * `function fooImpl()` declaration but registers its public hooks under
 * `'foo'`, the names diverge and the hooks silently never fire.
 *
 * These services wrap a named function EXPRESSION whose intrinsic `.name` is
 * the hook key (e.g. `const markDeliveredImpl = async function markDelivered()`),
 * so `<exportedProxy>.name` must equal the string the public `hookBefore/After*`
 * helpers register under. A Proxy with no `get` trap forwards `.name` to its
 * target, so reading `.name` off the exported wrapper is exactly what
 * hookable sees.
 */
describe('hookable name alignment — wrapped fn .name === hook key', () => {
  const cases = [
    ['markDelivered', markDelivered],
    ['createShipment', createShipmentNew],
    ['updateShipmentStatus', updateShipmentStatus],
    ['updateShipmentStatusFromCarrier', updateShipmentStatusFromCarrier],
    ['voidShipmentLabel', voidShipmentLabel]
  ];

  it.each(cases)('%s wrapper exposes name "%s"', (hookKey, wrapped) => {
    expect(wrapped.name).toBe(hookKey);
  });
});
