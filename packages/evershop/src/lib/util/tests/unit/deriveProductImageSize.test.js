import { deriveProductImageSize } from '../../deriveProductImageSize.js';

describe('deriveProductImageSize', () => {
  it('keeps a square box for a 1:1 original', () => {
    expect(deriveProductImageSize(800, { width: 1200, height: 1200 })).toEqual({
      width: 800,
      height: 800
    });
  });

  it('derives a portrait height from a portrait original', () => {
    expect(deriveProductImageSize(800, { width: 1000, height: 1500 })).toEqual({
      width: 800,
      height: 1200
    });
  });

  it('derives a landscape height from a landscape original', () => {
    expect(deriveProductImageSize(800, { width: 1600, height: 900 })).toEqual({
      width: 800,
      height: 450
    });
  });

  it('never requests more than the original width (no upscaling)', () => {
    expect(deriveProductImageSize(1920, { width: 1200, height: 1200 })).toEqual({
      width: 1200,
      height: 1200
    });
    expect(deriveProductImageSize(1920, { width: 1000, height: 1500 })).toEqual({
      width: 1000,
      height: 1500
    });
  });

  it('falls back to a square box when no usable original is given', () => {
    expect(deriveProductImageSize(600, null)).toEqual({
      width: 600,
      height: 600
    });
    expect(deriveProductImageSize(600, undefined)).toEqual({
      width: 600,
      height: 600
    });
    expect(deriveProductImageSize(600, { width: 0, height: 0 })).toEqual({
      width: 600,
      height: 600
    });
  });

  it('clamps the derived height to at least 1px', () => {
    expect(deriveProductImageSize(1, { width: 1000, height: 1 })).toEqual({
      width: 1,
      height: 1
    });
  });
});
