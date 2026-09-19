import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

const { callSubscribers } = await import('../../callSubscibers.js');
const { error } = await import('../../../../lib/log/logger.js');

describe('callSubscribers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls each subscriber with the event data', async () => {
    const sub1 = jest.fn().mockResolvedValue(undefined);
    const sub2 = jest.fn().mockResolvedValue(undefined);
    const data = { orderId: 1 };

    await callSubscribers([sub1, sub2], data);

    expect(sub1).toHaveBeenCalledWith(data);
    expect(sub2).toHaveBeenCalledWith(data);
  });

  it('does nothing when subscribers list is empty', async () => {
    await expect(callSubscribers([], { orderId: 1 })).resolves.toBeUndefined();
  });

  it('swallows subscriber errors and continues running remaining subscribers', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('boom'));
    const succeeding = jest.fn().mockResolvedValue(undefined);

    await callSubscribers([failing, succeeding], {});

    expect(failing).toHaveBeenCalled();
    expect(succeeding).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('runs all subscribers in parallel', async () => {
    const order = [];
    const slow = jest.fn(
      () =>
        new Promise((r) => {
          setTimeout(() => {
            order.push('slow');
            r();
          }, 10);
        })
    );
    const fast = jest.fn(
      () =>
        new Promise((r) => {
          setTimeout(() => {
            order.push('fast');
            r();
          }, 0);
        })
    );

    await callSubscribers([slow, fast], {});

    // If sequential, order would be ['slow', 'fast']
    // If parallel, fast resolves first
    expect(order).toEqual(['fast', 'slow']);
  });

  it('resolves even when all subscribers fail', async () => {
    const sub1 = jest.fn().mockRejectedValue(new Error('error 1'));
    const sub2 = jest.fn().mockRejectedValue(new Error('error 2'));

    await expect(callSubscribers([sub1, sub2], {})).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(2);
  });
});
