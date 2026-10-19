import { beforeEach, describe, expect, it } from '@jest/globals';
import type { ApiFailure, ApiResult } from '../../../ui/importApi.js';
import {
  MAX_BACKOFF_MS,
  MAX_RETRY_AFTER_MS,
  POLL_INTERVAL_MS,
  Poller
} from '../../../ui/poller.js';
import { FakeTab, settle } from '../helpers/fakeTab.js';

const failure = (over: Partial<ApiFailure>): ApiResult<number> => ({
  ok: false,
  error: {
    status: 500,
    code: null,
    message: 'x',
    details: {},
    retryAfterMs: null,
    aborted: false,
    ...over
  }
});

/** A source of answers: each call to `fetch` takes the next one, and can be held open. */
function source(...answers: Array<ApiResult<number> | 'hold'>) {
  const calls: number[] = [];
  let release: ((r: ApiResult<number>) => void) | null = null;
  return {
    calls,
    release: (r: ApiResult<number>) => release?.(r),
    fetch: () => {
      calls.push(calls.length);
      const answer = answers[Math.min(calls.length - 1, answers.length - 1)];
      if (answer === 'hold') {
        return new Promise<ApiResult<number>>((resolve) => {
          release = resolve;
        });
      }
      return Promise.resolve(answer);
    }
  };
}

const good = (value: number): ApiResult<number> => ({ ok: true, data: value });

describe('Poller', () => {
  let tab: FakeTab;
  let values: number[];
  let failures: Array<[number, number | null]>;

  beforeEach(() => {
    tab = new FakeTab();
    values = [];
    failures = [];
  });

  const make = (
    src: ReturnType<typeof source>,
    keepGoing: (v: number) => boolean = (v) => v < 100
  ) =>
    new Poller<number>({
      env: tab,
      fetch: src.fetch,
      keepGoing,
      onValue: (v) => values.push(v),
      onFailure: (f, again) => failures.push([f.status, again])
    });

  it('asks at once when it knows nothing, then every five seconds while the job goes on', async () => {
    const src = source(good(1), good(2), good(3));
    const poller = make(src);
    poller.start();
    await settle();
    expect(values).toEqual([1]);
    expect(tab.waiting).toBe(POLL_INTERVAL_MS);
    await tab.advance(POLL_INTERVAL_MS - 1);
    expect(src.calls).toHaveLength(1);
    await tab.advance(1);
    expect(values).toEqual([1, 2]);
    await tab.advance(POLL_INTERVAL_MS);
    expect(values).toEqual([1, 2, 3]);
  });

  it('stops asking when the answer says the job is over', async () => {
    const src = source(good(1), good(100), good(101));
    const poller = make(src);
    poller.start();
    await settle();
    await tab.advance(POLL_INTERVAL_MS);
    expect(values).toEqual([1, 100]);
    expect(tab.timerCount).toBe(0);
    await tab.advance(60_000);
    expect(src.calls).toHaveLength(2);
  });

  it('does not ask at all when the known state is already over', async () => {
    const src = source(good(1));
    make(src).start(100);
    await tab.advance(60_000);
    expect(src.calls).toHaveLength(0);
  });

  it('asks again only after the last ask has ended, so a slow server is not piled on', async () => {
    const src = source('hold');
    const poller = make(src);
    poller.start();
    await tab.advance(60_000);
    expect(src.calls).toHaveLength(1);
    poller.refresh();
    expect(src.calls).toHaveLength(1);
    src.release(good(1));
    await settle();
    expect(values).toEqual([1]);
    expect(tab.waiting).toBe(POLL_INTERVAL_MS);
  });

  it('refresh asks now and drops the timer that was waiting', async () => {
    const src = source(good(7));
    const poller = make(src);
    poller.start(1);
    expect(tab.waiting).toBe(POLL_INTERVAL_MS);
    poller.refresh();
    await settle();
    expect(values).toEqual([7]);
    expect(tab.timerCount).toBe(1);
  });

  describe('a tab that is not visible', () => {
    it('sets no timer while hidden, and asks at once when shown again', async () => {
      const src = source(good(1), good(2));
      const poller = make(src);
      poller.start(1);
      tab.setVisible(false);
      expect(tab.timerCount).toBe(0);
      await tab.advance(60_000);
      expect(src.calls).toHaveLength(0);
      tab.setVisible(true);
      await settle();
      expect(src.calls).toHaveLength(1);
      expect(tab.waiting).toBe(POLL_INTERVAL_MS);
    });

    it('does not ask when it is shown again after the job ended', async () => {
      const src = source(good(1));
      const poller = make(src);
      poller.start(100);
      tab.setVisible(false);
      tab.setVisible(true);
      await settle();
      expect(src.calls).toHaveLength(0);
    });

    it('lets an ask that was in the air finish, and sets no timer if the tab is hidden then', async () => {
      const src = source('hold');
      const poller = make(src);
      poller.start();
      tab.setVisible(false);
      src.release(good(1));
      await settle();
      expect(values).toEqual([1]);
      expect(tab.timerCount).toBe(0);
      tab.setVisible(true);
      await settle();
      expect(src.calls).toHaveLength(2);
    });

    it('does not ask twice when shown again while an ask is in the air', async () => {
      const src = source('hold');
      const poller = make(src);
      poller.start();
      tab.setVisible(false);
      tab.setVisible(true);
      expect(src.calls).toHaveLength(1);
    });
  });

  describe('when the server pushes back', () => {
    it('keeps the last state, and waits as long as Retry-After says', async () => {
      const src = source(
        good(1),
        failure({ status: 429, retryAfterMs: 20_000 }),
        good(2)
      );
      const poller = make(src);
      poller.start();
      await settle();
      await tab.advance(POLL_INTERVAL_MS);
      expect(values).toEqual([1]);
      expect(failures).toEqual([[429, 20_000]]);
      expect(tab.waiting).toBe(20_000);
      await tab.advance(19_999);
      expect(src.calls).toHaveLength(2);
      await tab.advance(1);
      expect(values).toEqual([1, 2]);
      expect(tab.waiting).toBe(POLL_INTERVAL_MS);
    });

    it('never waits less than the normal rhythm, whatever Retry-After says', async () => {
      const src = source(failure({ status: 429, retryAfterMs: 0 }), good(1));
      make(src).start();
      await settle();
      expect(failures).toEqual([[429, POLL_INTERVAL_MS]]);
    });

    it('never waits more than a minute on the word of a header', async () => {
      const src = source(failure({ status: 429, retryAfterMs: 3_600_000 }));
      make(src).start();
      await settle();
      expect(failures).toEqual([[429, MAX_RETRY_AFTER_MS]]);
    });

    it('doubles the wait without Retry-After, up to 30 seconds', async () => {
      const src = source(failure({ status: 429 }));
      make(src).start();
      await settle();
      const waits: number[] = [tab.waiting as number];
      for (let i = 0; i < 5; i += 1) {
        await tab.advance(tab.waiting as number);
        waits.push(tab.waiting as number);
      }
      expect(waits).toEqual([
        2 * POLL_INTERVAL_MS,
        4 * POLL_INTERVAL_MS,
        MAX_BACKOFF_MS,
        MAX_BACKOFF_MS,
        MAX_BACKOFF_MS,
        MAX_BACKOFF_MS
      ]);
    });

    it('goes back to the normal rhythm at the first good answer', async () => {
      const src = source(
        failure({ status: 503 }),
        failure({ status: 503 }),
        good(1),
        good(2)
      );
      make(src).start();
      await settle();
      await tab.advance(tab.waiting as number);
      expect(tab.waiting).toBe(4 * POLL_INTERVAL_MS);
      await tab.advance(tab.waiting as number);
      expect(values).toEqual([1]);
      expect(tab.waiting).toBe(POLL_INTERVAL_MS);
    });

    it('treats a request that got no answer as a reason to wait, not to stop', async () => {
      const src = source(failure({ status: 0 }), good(1));
      make(src).start();
      await settle();
      expect(failures).toEqual([[0, 2 * POLL_INTERVAL_MS]]);
      await tab.advance(2 * POLL_INTERVAL_MS);
      expect(values).toEqual([1]);
    });

    it('treats a fetch that throws like a failed ask', async () => {
      let calls = 0;
      const poller = new Poller<number>({
        env: tab,
        fetch: () => {
          calls += 1;
          return Promise.reject(new Error('boom'));
        },
        keepGoing: () => true,
        onValue: (v) => values.push(v),
        onFailure: (f, again) => failures.push([f.status, again])
      });
      poller.start();
      await settle();
      expect(calls).toBe(1);
      expect(failures).toEqual([[0, 2 * POLL_INTERVAL_MS]]);
    });

    it.each([401, 403, 404])(
      'stops for good on %i: asking again cannot help',
      async (status) => {
        const src = source(failure({ status }), good(1));
        make(src).start();
        await settle();
        expect(failures).toEqual([[status, null]]);
        expect(tab.timerCount).toBe(0);
        expect(tab.listenerCount).toBe(0);
        await tab.advance(120_000);
        expect(src.calls).toHaveLength(1);
      }
    );

    it('says nothing about an ask that the page aborted itself', async () => {
      const src = source(failure({ status: 0, aborted: true }));
      make(src).start();
      await settle();
      expect(failures).toEqual([]);
      expect(tab.timerCount).toBe(0);
    });
  });

  it('starts the doubling again from the normal rhythm after a good answer', async () => {
    const src = source(
      failure({ status: 503 }),
      failure({ status: 503 }),
      good(1),
      failure({ status: 503 })
    );
    make(src).start();
    await settle();
    await tab.advance(tab.waiting as number);
    expect(tab.waiting).toBe(4 * POLL_INTERVAL_MS);
    await tab.advance(tab.waiting as number);
    expect(values).toEqual([1]);
    await tab.advance(POLL_INTERVAL_MS);
    expect(tab.waiting).toBe(2 * POLL_INTERVAL_MS);
  });

  it('starting again without a stop leaves one timer and one listener, and the normal rhythm', async () => {
    // Every ask fails.
    const src = source(failure({ status: 503 }));
    const poller = make(src);
    poller.start();
    await settle();
    await tab.advance(tab.waiting as number);
    expect(tab.waiting).toBe(4 * POLL_INTERVAL_MS);
    poller.start(1);
    expect(tab.timerCount).toBe(1);
    expect(tab.listenerCount).toBe(1);
    expect(tab.waiting).toBe(POLL_INTERVAL_MS);
    // A failure after the restart begins the doubling again, not where it was.
    poller.refresh();
    await settle();
    expect(failures.at(-1)).toEqual([503, 2 * POLL_INTERVAL_MS]);
  });

  it('does not ask a second time when the tab says it is visible while the timer waits', async () => {
    const src = source(good(1));
    make(src).start(1);
    tab.setVisible(true);
    await settle();
    expect(src.calls).toHaveLength(0);
    expect(tab.timerCount).toBe(1);
  });

  it('asks when the tab is shown again after a first ask that failed while it was hidden', async () => {
    const src = source(failure({ status: 503 }), good(1));
    const poller = make(src);
    poller.start();
    tab.setVisible(false);
    await settle();
    expect(failures).toEqual([[503, 2 * POLL_INTERVAL_MS]]);
    expect(tab.timerCount).toBe(0);
    tab.setVisible(true);
    await settle();
    expect(values).toEqual([1]);
  });

  describe('stop', () => {
    it('clears the timer and the listener', async () => {
      const poller = make(source(good(1)));
      poller.start(1);
      expect(tab.timerCount).toBe(1);
      expect(tab.listenerCount).toBe(1);
      poller.stop();
      expect(tab.timerCount).toBe(0);
      expect(tab.listenerCount).toBe(0);
    });

    it('ignores the answer of an ask that was in the air', async () => {
      const src = source('hold');
      const poller = make(src);
      poller.start();
      poller.stop();
      src.release(good(1));
      await settle();
      expect(values).toEqual([]);
      expect(tab.timerCount).toBe(0);
    });

    it('can be started again, with a new state', async () => {
      const src = source(good(2));
      const poller = make(src);
      poller.start(1);
      poller.stop();
      poller.start(5);
      expect(tab.timerCount).toBe(1);
      expect(tab.listenerCount).toBe(1);
      await tab.advance(POLL_INTERVAL_MS);
      expect(values).toEqual([2]);
    });

    it('does not ask after stop, even by refresh or by the tab being shown', async () => {
      const src = source(good(1));
      const poller = make(src);
      poller.start(1);
      poller.stop();
      poller.refresh();
      tab.setVisible(false);
      tab.setVisible(true);
      await settle();
      expect(src.calls).toHaveLength(0);
    });
  });
});
