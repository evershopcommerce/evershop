import {
  getValue,
  getValueSync,
  addProcessor,
  getProcessors
} from '../../registry.js';
import { jest, describe, it, expect } from '@jest/globals';

describe('registry', () => {
  it('It should return the init value if no processor provided', async () => {
    const initValue = 1;
    const value = await getValue('test', initValue);
    expect(value).toEqual(initValue);
  });

  it('It should add processor to the registry', () => {
    const callback = () => {};
    addProcessor('test', callback);
    const processors = getProcessors('test');
    expect(processors).toEqual([
      {
        callback,
        priority: 10
      }
    ]);
  });

  it('It should throw error if priority is not a number', () => {
    const callback = () => {};
    expect(() => addProcessor('test', callback, 'abc')).toThrow(Error);
  });

  it('It should add processor to the registry with priority', () => {
    const negativeCallback = () => {};
    const beforeCallback = () => {};
    const afterCallback = () => {};

    addProcessor('test2', negativeCallback, -5);
    addProcessor('test2', beforeCallback, 5);
    addProcessor('test2', afterCallback, 20);
    const processors = getProcessors('test2');
    expect(JSON.stringify(processors)).toEqual(
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

  it('It should throw error if callback is not a function', () => {
    expect(() => addProcessor('test', 'abc')).toThrow(Error);
  });

  it('It should accept async function as callback', () => {
    const callback = async () => {};
    addProcessor('testasync', callback);
    const processors = getProcessors('testasync');
    expect(processors).toEqual([
      {
        callback,
        priority: 10
      }
    ]);
  });

  it('It should execute the processor function in order', async () => {
    const callback1 = jest.fn(async () => {
      return 1;
    });
    const callback2 = jest.fn(async () => {
      return 2;
    });
    const callback3 = jest.fn(async () => {
      return 3;
    });
    addProcessor('test3', callback1, 10);
    addProcessor('test3', callback2, 5);
    addProcessor('test3', callback3, 20);
    const value = await getValue('test3', 1);
    expect(value).toEqual(3);
    expect(callback3).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
    expect(callback1).toHaveBeenCalled();
  });

  it('It should skip the processors if the init value and the context are identical', async () => {
    const callback1 = jest.fn(async () => {
      return 1;
    });
    const callback2 = jest.fn(async () => {
      return 2;
    });
    const callback3 = jest.fn(async () => {
      return 3;
    });
    addProcessor('test4', callback1, 10);
    addProcessor('test4', callback2, 5);
    addProcessor('test4', callback3, 20);
    const value = await getValue('test4', 1, { a: 1 });
    expect(value).toEqual(3);
    expect(callback3).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
    expect(callback1).toHaveBeenCalled();

    const value2 = await getValue('test4', 1, { a: 1 });
    expect(value2).toEqual(3);
    expect(callback3).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1);
  });

  it('It should overwrite the init value and the context if the init value and the context are not identical', async () => {
    const callback = jest.fn(async (value) => {
      return ++value;
    });
    addProcessor('test5', callback, 10);
    const value = await getValue('test5', 1, { a: 1 });
    expect(value).toEqual(2);
    expect(callback).toHaveBeenCalled();
    const valueAgain = await getValue('test5', 1, { a: 1 });
    expect(valueAgain).toEqual(2);
    expect(callback).toHaveBeenCalledTimes(1);

    const value2 = await getValue('test5', 2, { a: 2 });
    expect(value2).toEqual(3);
    expect(callback).toHaveBeenCalledTimes(2);

    const value3 = await getValue('test5', 1, { a: 1 });
    expect(value3).toEqual(2);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('It should throw an error if the value does not pass the validator', async () => {
    const callback = jest.fn(async (value) => {
      return ++value;
    });
    addProcessor('test6', callback, 10);
    expect(async () => {
      await getValue('test6', 1, {}, (value) => {
        return value > 3;
      });
    }).rejects.toThrow(Error);
  });

  it('The getValueSync function should throw if the processor is async', () => {
    const callback = async () => {};
    addProcessor('test7', callback);
    expect(() => {
      getValueSync('test7', 1);
    }).toThrow(Error);
  });

  it('It should throw an error if one of the processor throws an error', async () => {
    const callback1 = jest.fn(async () => {
      return 1;
    });
    const callback2 = jest.fn(async () => {
      throw new Error('error');
    });
    const callback3 = jest.fn(async () => {
      return 3;
    });
    addProcessor('test8', callback1, 2);
    addProcessor('test8', callback2, 5);
    addProcessor('test8', callback3, 20);
    expect(async () => {
      await getValue('test8', 1);
    }).rejects.toThrow(Error);
    expect(callback3).not.toHaveBeenCalled();
    expect(callback1).toHaveBeenCalled();
  });

  it('It should throw an error if one of the processor throws an error', () => {
    const callback1 = jest.fn(() => {
      return 1;
    });
    const callback2 = jest.fn(() => {
      throw new Error('error');
    });
    const callback3 = jest.fn(() => {
      return 3;
    });
    addProcessor('test9', callback1, 2);
    addProcessor('test9', callback2, 5);
    addProcessor('test9', callback3, 20);
    expect(() => {
      getValueSync('test9', 1);
    }).toThrow(Error);
    expect(callback3).not.toHaveBeenCalled();
    expect(callback1).toHaveBeenCalled();
  });
});
