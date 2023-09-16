/* eslint-disable no-undef, global-require */
const { merge } = require('../../merge');

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

  it('It should not overwrite the value from the first object if it is existed and truthy', () => {
    const a = { a: 1 };
    const b = { a: 2, c: 1 };
    const c = merge(a, b);
    expect(c.a).toEqual(1);
  });

  it('It should overwrite the value from the first object if it is not truthy', () => {
    const a = { a: '', c: null, d: [] };
    const b = { a: 2, c: 1, d: 1 };
    const c = merge(a, b);
    expect(c.a).toEqual(2);
    expect(c.c).toEqual(1);
    expect(c.d).toEqual([]);
  });
});
