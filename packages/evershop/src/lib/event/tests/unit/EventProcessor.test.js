import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock logger to silence output and allow assertion
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

// Mock callSubscribers so EventProcessor doesn't need the real module
jest.unstable_mockModule('../../callSubscibers.js', () => ({
  callSubscribers: jest.fn().mockResolvedValue(undefined)
}));

const { createEventProcessor } = await import('../../EventProcessor.js');
const { callSubscribers } = await import('../../callSubscibers.js');
const { error } = await import('../../../../lib/log/logger.js');

// Helper: build a minimal subscriber list
const makeSubscribers = (eventName, fn) => [
  { event: eventName, subscriber: fn }
];

// Helper: build a minimal event row
const makeEvent = (name = 'order_placed', uuid = 'uuid-1') => ({
  uuid,
  name,
  data: { orderId: 42 }
});

describe('createEventProcessor', () => {
  let storage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = {
      claimBatch: jest.fn().mockResolvedValue([]),
      markDoneAndDelete: jest.fn().mockResolvedValue(undefined)
    };
  });

  // --- loadAndProcess ---

  describe('loadAndProcess', () => {
    it('does nothing when claimBatch returns empty array', async () => {
      storage.claimBatch.mockResolvedValue([]);
      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: []
      });

      await loadAndProcess();

      expect(storage.claimBatch).toHaveBeenCalledTimes(1);
      expect(storage.markDoneAndDelete).not.toHaveBeenCalled();
    });

    it('claims batch with correct batch size', async () => {
      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: []
      });
      await loadAndProcess();
      expect(storage.claimBatch).toHaveBeenCalledWith(10);
    });

    it('calls callSubscribers for each claimed event with matching subscribers and data', async () => {
      const subscriber = jest.fn();
      const events = [
        makeEvent('order_placed', 'uuid-1'),
        makeEvent('order_placed', 'uuid-2')
      ];
      storage.claimBatch.mockResolvedValue(events);

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers('order_placed', subscriber)
      });

      await loadAndProcess();
      // Allow fire-and-forget promises to settle
      await new Promise((r) => setImmediate(r));

      // callSubscribers is mocked — verify it was called once per event with the right args
      expect(callSubscribers).toHaveBeenCalledTimes(2);
      expect(callSubscribers).toHaveBeenCalledWith([subscriber], {
        orderId: 42
      });
    });

    it('only passes subscribers matching the event name to callSubscribers', async () => {
      const orderSubscriber = jest.fn();
      const otherSubscriber = jest.fn();
      storage.claimBatch.mockResolvedValue([
        makeEvent('order_placed', 'uuid-1')
      ]);

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: [
          { event: 'order_placed', subscriber: orderSubscriber },
          { event: 'other_event', subscriber: otherSubscriber }
        ]
      });

      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      // Only the matching subscriber should be passed to callSubscribers
      expect(callSubscribers).toHaveBeenCalledWith(
        [orderSubscriber],
        expect.anything()
      );
      const calls = callSubscribers.mock.calls;
      expect(calls.every((c) => !c[0].includes(otherSubscriber))).toBe(true);
    });

    it('prevents concurrent execution via isProcessing guard', async () => {
      let resolveFirstClaim;
      storage.claimBatch.mockReturnValueOnce(
        new Promise((r) => {
          resolveFirstClaim = r;
        })
      );

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: []
      });

      // Start first call — it will hang on claimBatch
      const first = loadAndProcess();
      // Second call fires while first is still awaiting claimBatch
      await loadAndProcess();

      // Only one claimBatch call should have been made
      expect(storage.claimBatch).toHaveBeenCalledTimes(1);

      // Resolve first and let it finish
      resolveFirstClaim([]);
      await first;
    });

    it('schedules setImmediate for next batch when full batch is returned', async () => {
      const BATCH_SIZE = 10;
      const fullBatch = Array.from({ length: BATCH_SIZE }, (_, i) =>
        makeEvent('order_placed', `uuid-${i}`)
      );
      // First call returns full batch, second returns empty to stop the chain
      storage.claimBatch.mockResolvedValueOnce(fullBatch).mockResolvedValue([]);

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: []
      });
      await loadAndProcess();

      // Wait for setImmediate to fire and the second loadAndProcess to complete
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));

      expect(storage.claimBatch).toHaveBeenCalledTimes(2);
    });

    it('logs error and returns when claimBatch throws', async () => {
      storage.claimBatch.mockRejectedValue(new Error('DB connection lost'));
      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: []
      });

      await loadAndProcess();

      expect(error).toHaveBeenCalled();
      expect(storage.markDoneAndDelete).not.toHaveBeenCalled();
    });
  });

  // --- executeSubscribers (via loadAndProcess) ---

  describe('executeSubscribers', () => {
    it('marks event done and deletes it after subscribers run', async () => {
      const event = makeEvent('order_placed', 'uuid-abc');
      storage.claimBatch.mockResolvedValue([event]);

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers(
          'order_placed',
          jest.fn().mockResolvedValue(undefined)
        )
      });

      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      expect(storage.markDoneAndDelete).toHaveBeenCalledWith('uuid-abc');
    });

    it('still marks done and deletes even when subscriber throws', async () => {
      const event = makeEvent('order_placed', 'uuid-fail');
      storage.claimBatch.mockResolvedValue([event]);
      callSubscribers.mockRejectedValueOnce(new Error('subscriber exploded'));

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers('order_placed', jest.fn())
      });

      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      expect(storage.markDoneAndDelete).toHaveBeenCalledWith('uuid-fail');
    });

    it('logs error but does not throw when markDoneAndDelete fails', async () => {
      const event = makeEvent('order_placed', 'uuid-cleanup-fail');
      storage.claimBatch.mockResolvedValue([event]);
      storage.markDoneAndDelete.mockRejectedValueOnce(
        new Error('delete failed')
      );

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers(
          'order_placed',
          jest.fn().mockResolvedValue(undefined)
        )
      });

      // Should not throw
      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      expect(error).toHaveBeenCalled();
    });

    it('processes multiple events concurrently and cleans up all of them', async () => {
      const events = [
        makeEvent('order_placed', 'uuid-1'),
        makeEvent('order_placed', 'uuid-2'),
        makeEvent('order_placed', 'uuid-3')
      ];
      storage.claimBatch.mockResolvedValue(events);

      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers(
          'order_placed',
          jest.fn().mockResolvedValue(undefined)
        )
      });

      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      expect(storage.markDoneAndDelete).toHaveBeenCalledTimes(3);
      expect(storage.markDoneAndDelete).toHaveBeenCalledWith('uuid-1');
      expect(storage.markDoneAndDelete).toHaveBeenCalledWith('uuid-2');
      expect(storage.markDoneAndDelete).toHaveBeenCalledWith('uuid-3');
    });
  });

  // --- beforeBatch hook (per-batch settings refresh) ---

  describe('beforeBatch hook', () => {
    it('runs once before subscribers on a non-empty batch', async () => {
      const calls = [];
      const beforeBatch = jest.fn(async () => calls.push('refresh'));
      callSubscribers.mockImplementation(async () => calls.push('subscribers'));
      storage.claimBatch.mockResolvedValue([makeEvent('order_placed', 'u1')]);
      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers('order_placed', jest.fn()),
        beforeBatch
      });

      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      expect(beforeBatch).toHaveBeenCalledTimes(1);
      // refresh happens before subscribers run
      expect(calls[0]).toBe('refresh');
    });

    it('does NOT run on an empty batch (no idle refresh)', async () => {
      const beforeBatch = jest.fn().mockResolvedValue(undefined);
      storage.claimBatch.mockResolvedValue([]);
      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: [],
        beforeBatch
      });

      await loadAndProcess();

      expect(beforeBatch).not.toHaveBeenCalled();
    });

    it('logs and continues processing when beforeBatch rejects (never drops events)', async () => {
      const beforeBatch = jest
        .fn()
        .mockRejectedValue(new Error('refresh failed'));
      storage.claimBatch.mockResolvedValue([makeEvent('order_placed', 'u1')]);
      const { loadAndProcess } = createEventProcessor({
        storage,
        subscribers: makeSubscribers('order_placed', jest.fn()),
        beforeBatch
      });

      await loadAndProcess();
      await new Promise((r) => setImmediate(r));

      expect(error).toHaveBeenCalled();
      // events still processed despite the refresh failure
      expect(callSubscribers).toHaveBeenCalledTimes(1);
      expect(storage.markDoneAndDelete).toHaveBeenCalledWith('u1');
    });
  });
});
