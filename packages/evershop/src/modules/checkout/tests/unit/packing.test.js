process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { buildDefaultParcels } from '../../services/cart/packing.js';

describe('buildDefaultParcels (default single-parcel heuristic)', () => {
  const box = (length, width, height, tareWeight = 0, name = null) => ({
    packageUuid: null,
    name,
    length,
    width,
    height,
    tareWeight
  });

  it('returns [] when no item carries package dimensions (legacy carts)', () => {
    expect(buildDefaultParcels([], 5)).toEqual([]);
  });

  it('returns one parcel sized by the largest candidate by volume', () => {
    const parcels = buildDefaultParcels(
      [box(10, 10, 10, 0.1, 'small'), box(30, 25, 10, 0.3, 'big')],
      2.5
    );
    expect(parcels).toHaveLength(1);
    expect(parcels[0].name).toBe('big');
    expect(parcels[0].length).toBe(30);
    expect(parcels[0].tareWeight).toBe(0.3);
    expect(parcels[0].goodsWeight).toBe(2.5);
  });

  it('keeps a flat envelope (height 0) as a valid parcel', () => {
    const parcels = buildDefaultParcels([box(25, 18, 0, 0.05, 'envelope')], 0.2);
    expect(parcels).toHaveLength(1);
    expect(parcels[0].height).toBe(0);
    expect(parcels[0].tareWeight).toBe(0.05);
  });

  it('a real box beats an envelope of nominally larger footprint', () => {
    // envelope volume comparison uses height >= 1, so 30×20 envelope (≈600)
    // loses to a 15×15×10 box (2250).
    const parcels = buildDefaultParcels(
      [box(30, 20, 0, 0.05, 'envelope'), box(15, 15, 10, 0.2, 'box')],
      1
    );
    expect(parcels[0].name).toBe('box');
  });

  it('drops candidates with invalid dims and defaults non-finite tare to 0', () => {
    const parcels = buildDefaultParcels(
      [box(NaN, 10, 10, 0.5), box(10, 10, 10, NaN, 'ok')],
      1
    );
    expect(parcels).toHaveLength(1);
    expect(parcels[0].name).toBe('ok');
    expect(parcels[0].tareWeight).toBe(0);
  });

  it('rounds goods weight to 4 decimals and guards non-numeric input', () => {
    const parcels = buildDefaultParcels([box(10, 10, 10)], 1.000049);
    expect(parcels[0].goodsWeight).toBe(1);
    const parcels2 = buildDefaultParcels([box(10, 10, 10)], undefined);
    expect(parcels2[0].goodsWeight).toBe(0);
  });
});
