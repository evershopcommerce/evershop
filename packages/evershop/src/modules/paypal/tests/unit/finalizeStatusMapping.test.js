import {
  mapAuthorizationStatus,
  mapCaptureStatus
} from '../../services/finalizePaypalOrder.js';

/**
 * Pins the settlement contract (spec decision D1/D2): a PENDING capture or
 * authorization (eCheck, manual review) must land on paypal_pending — never
 * on the paid statuses — and every declined/failed/unknown status maps to
 * null so the caller raises PaypalPaymentDeclinedError instead of writing
 * anything.
 */
describe('capture status mapping', () => {
  it('COMPLETED settles as captured', () => {
    expect(mapCaptureStatus('COMPLETED')).toBe('paypal_captured');
  });
  it('PENDING stays unsettled', () => {
    expect(mapCaptureStatus('PENDING')).toBe('paypal_pending');
  });
  it('everything else is a decline', () => {
    expect(mapCaptureStatus('DECLINED')).toBeNull();
    expect(mapCaptureStatus('FAILED')).toBeNull();
    expect(mapCaptureStatus(undefined)).toBeNull();
  });
});

describe('authorization status mapping', () => {
  it('CREATED settles as authorized', () => {
    expect(mapAuthorizationStatus('CREATED')).toBe('paypal_authorized');
  });
  it('PENDING stays unsettled', () => {
    expect(mapAuthorizationStatus('PENDING')).toBe('paypal_pending');
  });
  it('everything else is a decline', () => {
    expect(mapAuthorizationStatus('DENIED')).toBeNull();
    expect(mapAuthorizationStatus('EXPIRED')).toBeNull();
    expect(mapAuthorizationStatus(undefined)).toBeNull();
  });
});
