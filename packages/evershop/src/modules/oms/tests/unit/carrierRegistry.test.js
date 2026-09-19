process.env.ALLOW_CONFIG_MUTATIONS = 'true';

import {
  __resetCarrierRegistryForTests,
  getAllCarriers,
  getCarrier,
  lockCarrierRegistry,
  registerCarrier
} from '../../services/carrier/registry.js';

describe('carrier registry', () => {
  beforeEach(() => {
    __resetCarrierRegistryForTests();
  });

  it('registers a carrier and returns it via getCarrier', () => {
    registerCarrier({
      code: 'fedex',
      name: 'FedEx',
      generateTrackingUrl: (ctx) =>
        `https://fedex.com/track/${ctx.trackingNumber}`
    });
    const c = getCarrier('fedex');
    expect(c).toBeDefined();
    expect(c.name).toBe('FedEx');
    expect(c.generateTrackingUrl({ trackingNumber: '123' })).toBe(
      'https://fedex.com/track/123'
    );
  });

  it('aggregator carriers can route by metadata in the method envelope', () => {
    // The whole point of the CarrierMethodContext envelope: aggregators
    // (Shippo, EasyPost) keep zero state of their own and read the
    // underlying-carrier hint off the shipment's stored metadata.
    registerCarrier({
      code: 'shippo',
      name: 'Shippo',
      generateTrackingUrl: (ctx) => {
        const sub = ctx.metadata?.underlyingCarrier ?? 'unknown';
        return `https://track.shippo.com/${sub}/${ctx.trackingNumber}`;
      }
    });
    const c = getCarrier('shippo');
    expect(
      c.generateTrackingUrl({
        trackingNumber: 'SHP123',
        metadata: { underlyingCarrier: 'ups' }
      })
    ).toBe('https://track.shippo.com/ups/SHP123');
  });

  it('getCarrier returns undefined for unknown codes', () => {
    expect(getCarrier('not-a-real-carrier')).toBeUndefined();
    expect(getCarrier('')).toBeUndefined();
    expect(getCarrier(null)).toBeUndefined();
    expect(getCarrier(undefined)).toBeUndefined();
  });

  it('getAllCarriers returns every registered carrier', () => {
    registerCarrier({ code: 'a', name: 'A' });
    registerCarrier({ code: 'b', name: 'B' });
    registerCarrier({ code: 'c', name: 'C' });
    const all = getAllCarriers();
    expect(all).toHaveLength(3);
    expect(all.map((c) => c.code).sort()).toEqual(['a', 'b', 'c']);
  });

  it('rejects duplicate codes', () => {
    registerCarrier({ code: 'fedex', name: 'FedEx' });
    expect(() =>
      registerCarrier({ code: 'fedex', name: 'Different name' })
    ).toThrow(/already registered/);
  });

  it('rejects carriers with missing code or name', () => {
    expect(() => registerCarrier({ name: 'No code' })).toThrow(
      /code and name/
    );
    expect(() => registerCarrier({ code: 'no-name' })).toThrow(
      /code and name/
    );
  });

  it('throws when registerCarrier is called after lock', () => {
    registerCarrier({ code: 'ok', name: 'Before lock' });
    lockCarrierRegistry();
    expect(() =>
      registerCarrier({ code: 'late', name: 'After lock' })
    ).toThrow(/after bootstrap/);
  });
});
