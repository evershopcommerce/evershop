const {
  hookable,
  hookBefore,
  getHooks,
  clearHooks,
  lockHooks
} = require('../../hookable');

describe('hookBefore', () => {
  it('It should add before hook to the registry', () => {
    const callback = () => {};
    hookBefore('test', callback);
    const { beforeHooks } = getHooks();
    expect(beforeHooks.get('test')).toEqual([
      {
        callback,
        priority: 10
      }
    ]);
  });

  it('It should throw error if priority is not a number', () => {
    const callback = () => {};
    expect(() => hookBefore('test', callback, 'abc')).toThrow(Error);
  });

  it('It should add before hook to the registry with priority', () => {
    const negativeCallback = () => {};
    const beforeCallback = () => {};
    const afterCallback = () => {};

    hookBefore('test2', beforeCallback, 5);
    hookBefore('test2', negativeCallback, -5);
    hookBefore('test2', afterCallback, 20);
    const { beforeHooks } = getHooks();
    expect(JSON.stringify(beforeHooks.get('test2'))).toEqual(
      JSON.stringify([
        {
          callback: negativeCallback,
          priority: -5
        },
        {
          callback: beforeCallback,
          priority: 5
        },
        {
          callback: afterCallback,
          priority: 20
        }
      ])
    );
  });
});

describe('hookable', () => {
  it('It should throw error if the original function is not a named function', () => {
    expect(() => hookable(() => {})).toThrow(Error);
  });

  it('It should return a function', () => {
    const func = function test() {};
    expect(typeof hookable(func)).toEqual('function');
  });

  it('It should call the original function', () => {
    const func = jest.fn();
    const hookedFunc = hookable(func);
    hookedFunc();
    expect(func).toHaveBeenCalled();
  });

  it('It should throw error if one of the callback throws error', () => {
    const test = jest.fn();
    hookBefore('mockConstructor', () => {
      throw new Error('Error');
    });
    const hookedFunc = hookable(test);
    expect(() => hookedFunc()).toThrow(Error);
  });

  it('It should throw error if one of the callback throws error', async () => {
    const test = jest.fn();
    hookBefore('mockConstructor', async () => {
      throw new Error('Error');
    });
    const hookedFunc = hookable(test);
    await expect(async () => await hookedFunc()).rejects.toThrow('Error');
  });

  it('It should call the before hook in correct order', () => {
    clearHooks();
    const data = [];
    const test = jest.fn();
    const beforeCallback1 = jest.fn(() => data.push(1));
    const beforeCallback2 = jest.fn(() => data.push(2));
    const beforeCallback3 = jest.fn(() => data.push(3));
    hookBefore('mockConstructor', beforeCallback1);
    hookBefore('mockConstructor', beforeCallback2);
    hookBefore('mockConstructor', beforeCallback3, 1);
    const hookedFunc = hookable(test);
    hookedFunc();
    expect(beforeCallback1).toHaveBeenCalled();
    expect(beforeCallback2).toHaveBeenCalled();
    expect(beforeCallback3).toHaveBeenCalled();
    expect(data).toEqual([3, 1, 2]);
  });

  it('It should call the before hook in correct order async', () => {
    clearHooks();
    const data = [];
    const test = jest.fn(async () => new Promise((resolve) => resolve()));
    const beforeCallback1 = jest.fn(
      async () => new Promise((resolve) => resolve(data.push(1)))
    );
    const beforeCallback2 = jest.fn(
      async () => new Promise((resolve) => resolve(data.push(2)))
    );
    const beforeCallback3 = jest.fn(
      async () => new Promise((resolve) => resolve(data.push(3)))
    );
    hookBefore('mockConstructor', beforeCallback1);
    hookBefore('mockConstructor', beforeCallback2);
    hookBefore('mockConstructor', beforeCallback3, 1);
    const hookedFunc = hookable(test);
    hookedFunc();
    expect(beforeCallback1).toHaveBeenCalled();
    expect(beforeCallback2).toHaveBeenCalled();
    expect(beforeCallback3).toHaveBeenCalled();
    expect(data).toEqual([3, 1, 2]);
  });

  it('It should call the before hook in correct order async', async () => {
    clearHooks();
    const data = [];
    const test = jest.fn(
      async () =>
        new Promise((resolve) => {
          data.push(0);
          setTimeout(() => {
            data.push(4);
            resolve();
          }, 1000);
        })
    );
    const beforeCallback1 = jest.fn(
      async () => new Promise((resolve) => resolve(data.push(1)))
    );
    const beforeCallback2 = jest.fn(
      async () => new Promise((resolve) => resolve(data.push(2)))
    );
    const beforeCallback3 = jest.fn(() => data.push(3));
    hookBefore('mockConstructor', beforeCallback1);
    hookBefore('mockConstructor', beforeCallback2);
    hookBefore('mockConstructor', beforeCallback3);
    const hookedFunc = hookable(test);
    await hookedFunc();
    expect(beforeCallback1).toHaveBeenCalled();
    expect(beforeCallback2).toHaveBeenCalled();
    expect(beforeCallback3).toHaveBeenCalled();
    expect(data).toEqual([1, 2, 3, 0, 4]);
  });

  it('It should call the original function with correct argument', () => {
    const test = jest.fn();
    const hookedFunc = hookable(test);
    hookedFunc(1, 2, 3);
    expect(test).toHaveBeenCalledWith(1, 2, 3);
  });

  it('It should call the callback with correct context', () => {
    const test = jest.fn();
    const beforeCallback = jest.fn(function () {
      expect(this).toEqual({ test: 1 });
    });
    hookBefore('mockConstructor', beforeCallback);
    const hookedFunc = hookable(test, { test: 1 });
    hookedFunc();
    expect(beforeCallback).toHaveBeenCalled();
  });
});

describe('lockHooks', () => {
  it('It should throw error if the hook is locked', () => {
    lockHooks();
    const callback = () => {};
    expect(() => hookBefore('test', callback)).toThrow(Error);
  });
});
