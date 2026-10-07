import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: jest.fn(),
  refreshSetting: jest.fn()
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn()
}));

const { runDeliveryTick } = await import('../../services/processDeliveries.js');

describe('runDeliveryTick', () => {
  let deps: any;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    const track = (name: string, value: any = 0) =>
      jest.fn(async (..._args: any[]) => {
        calls.push(name);
        return value;
      });
    deps = {
      refreshSettings: track('refreshSettings', undefined),
      cancelPendingForDisabled: track('cancelPendingForDisabled'),
      reclaimStuck: track('reclaimStuck'),
      claimDue: track('claimDue', []),
      deliver: track('deliver', undefined),
      getLogLimit: track('getLogLimit', 100),
      trimFinished: track('trimFinished'),
      trimFailed: track('trimFailed'),
      logError: jest.fn()
    };
  });

  it('runs the steps in order: settings, cancel, reclaim, claim, trim', async () => {
    await runDeliveryTick(deps);

    expect(calls).toEqual([
      'refreshSettings',
      'cancelPendingForDisabled',
      'reclaimStuck',
      'claimDue',
      'getLogLimit',
      'trimFinished',
      'trimFailed'
    ]);
  });

  it('claims at most 50 due deliveries and sends every one', async () => {
    const due = Array.from({ length: 25 }, (_, i) => ({
      webhook_delivery_id: i
    }));
    deps.claimDue.mockResolvedValue(due);

    const result = await runDeliveryTick(deps);

    expect(deps.claimDue).toHaveBeenCalledWith(50);
    expect(deps.deliver).toHaveBeenCalledTimes(25);
    expect(result.claimed).toBe(25);
  });

  it('never has more than 10 deliveries in flight at once', async () => {
    let inFlight = 0;
    let peak = 0;
    deps.claimDue.mockResolvedValue(
      Array.from({ length: 35 }, (_, i) => ({ webhook_delivery_id: i }))
    );
    deps.deliver.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setImmediate(r));
      inFlight -= 1;
    });

    await runDeliveryTick(deps);

    expect(peak).toBe(10);
    expect(deps.deliver).toHaveBeenCalledTimes(35);
  });

  it('trims with the configured log limit', async () => {
    deps.getLogLimit.mockResolvedValue(250);

    await runDeliveryTick(deps);

    expect(deps.trimFinished).toHaveBeenCalledWith(250);
  });

  it('one failing step does not stop the others', async () => {
    deps.reclaimStuck.mockRejectedValue(new Error('boom'));
    deps.claimDue.mockResolvedValue([{ webhook_delivery_id: 1 }]);

    await runDeliveryTick(deps);

    expect(deps.logError).toHaveBeenCalledTimes(1);
    expect(deps.deliver).toHaveBeenCalledTimes(1);
    expect(deps.trimFinished).toHaveBeenCalled();
    expect(deps.trimFailed).toHaveBeenCalled();
  });

  it('keeps sending the rest when one delivery rejects', async () => {
    deps.claimDue.mockResolvedValue([
      { webhook_delivery_id: 1 },
      { webhook_delivery_id: 2 }
    ]);
    deps.deliver.mockRejectedValueOnce(new Error('db blip'));

    await runDeliveryTick(deps);

    expect(deps.deliver).toHaveBeenCalledTimes(2);
    expect(deps.logError).toHaveBeenCalledTimes(1);
  });
});
