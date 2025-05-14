import { merge } from '../../merge.js';

describe('Test until merge', () => {
  it('It should thrown an exception if `object` is not an object or null', () => {
    const a = 1;
    const b = { b: 1 };
    expect(() => merge(a, b)).toThrow(Error);
  });

  it('It should thrown an exception if `object` is not an object or null', () => {
    const a = { a: 1 };
    const b = null;
    expect(() => merge(a, b)).toThrow(Error);
  });

  it('It should return an object contains all property from 2 provided object', () => {
    const a = { a: 1 };
    const b = { b: 1, c: 1 };
    expect(merge(a, b)).toEqual({ a: 1, b: 1, c: 1 });
  });

  it('It should not overwrite the value from the first object if it is existed', () => {
    const a = { a: 1 };
    const b = { a: 2, c: 1 };
    const c = merge(a, b);
    expect(c.a).toEqual(2);
  });

  it('It should overwrite the value from the first object', () => {
    const a = { a: '', c: null, d: [] };
    const b = { a: 2, c: 1, d: 1 };
    const c = merge(a, b);
    expect(c.a).toEqual(2);
    expect(c.c).toEqual(1);
    expect(c.d).toEqual(1);
  });

  it('It should merge array property from 2 objects', () => {
    const a = { a: [1, 2] };
    const b = { a: [2, 3], c: 1 };
    const c = merge(a, b);
    expect(c.a).toEqual([1, 2, 3]);
  });

  it('It should thrown an exception if the maximum depth is exceeded', () => {
    const a = {
      a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 1 } } } } } } } } } }
    };
    const b = {
      a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 2 } } } } } } } } } }
    };
    expect(() => merge(a, b, 5)).toThrow(Error);
  });
});
