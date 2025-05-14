import { assign } from '../../assign.js';

describe('assign', () => {
  it('It should assign an object to the main object', () => {
    const a = { a: 1 };
    const b = { b: 1 };
    assign(a, b);
    expect(a).toEqual({ a: 1, b: 1 });
  });

  it('It should thrown an exception if `object` is not an object or null', () => {
    const a = 1;
    const b = { b: 1 };
    expect(() => assign(a, b)).toThrow(Error);
  });

  it('It should thrown an exception if `object` is not an object or null', () => {
    const a = null;
    const b = { b: 1 };
    expect(() => assign(a, b)).toThrow(Error);
  });

  it('It should thrown an exception if data is not an object or null', () => {
    const a = { a: 1 };
    const b = 1;
    expect(() => assign(a, b)).toThrow(Error);
  });

  it('It should thrown an exception if data is not an object or null', () => {
    const a = { a: 1 };
    const b = null;
    expect(() => assign(a, b)).toThrow(Error);
  });

  it('It should overwrite if the property is already existed', () => {
    const a = { a: 1, b: 1 };
    const b = { b: 2 };
    assign(a, b);
    expect(a).toEqual({ a: 1, b: 2 });
  });
});
