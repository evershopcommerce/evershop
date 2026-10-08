import { fitLogo } from '../../logoSizing.js';

describe('fitLogo', () => {
  it('caps a tall logo by height, preserving aspect', () => {
    // 200×800 (1:4) → height clamped to 44, width scales down with it.
    expect(fitLogo(200, 800)).toEqual({ width: 11, height: 44 });
  });

  it('caps a very wide logo by max width', () => {
    // 800×100 (8:1) → width clamped to 200, height scales down with it.
    expect(fitLogo(800, 100)).toEqual({ width: 200, height: 25 });
  });

  it('caps a typical wordmark by height', () => {
    // 300×80 → height is the binding constraint (44), width follows.
    expect(fitLogo(300, 80)).toEqual({ width: 165, height: 44 });
  });

  it('never upscales a logo that already fits', () => {
    expect(fitLogo(90, 30)).toEqual({ width: 90, height: 30 });
  });

  it('returns null for unknown or invalid dimensions', () => {
    expect(fitLogo(NaN, 100)).toBeNull();
    expect(fitLogo(0, 100)).toBeNull();
    expect(fitLogo(100, -5)).toBeNull();
  });
});
