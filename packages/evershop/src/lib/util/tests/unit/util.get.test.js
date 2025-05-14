import { get } from '../../get.js';

describe('Test until get', () => {
  it('It should return the value if path is valid', () => {
    const object = { a: 1, b: { c: 1 } };
    const result = get(object, 'b.c');
    expect(result).toEqual(1);
  });

  it('It should return undefined if the object is not an object', () => {
    const object = 1;
    expect(get(object, 'a.b')).toEqual(undefined);
  });

  it('It should return undefined if the path is not found', () => {
    const object = { a: 1, b: { c: 1 } };
    expect(get(object, 'a.b.c')).toEqual(undefined);
  });

  it('It should return default value if the path is not found', () => {
    const object = { a: 1, b: { c: 1 } };
    const defaultValue = 10;
    expect(get(object, 'a.b.d', defaultValue)).toEqual(10);
  });
});
