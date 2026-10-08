import { describe, it, expect } from '@jest/globals';
import { planAfterFailure } from '../../services/backoff.js';
import { MAX_ATTEMPTS } from '../../services/constants.js';

const NOW = new Date('2026-10-07T10:00:00.000Z');
const minutesLater = (m: number) => new Date(NOW.getTime() + m * 60000);

describe('planAfterFailure', () => {
  it('retries after 1, 5, 30 and 120 minutes', () => {
    expect(planAfterFailure(1, NOW)).toEqual({
      status: 'pending',
      nextAttemptAt: minutesLater(1)
    });
    expect(planAfterFailure(2, NOW).nextAttemptAt).toEqual(minutesLater(5));
    expect(planAfterFailure(3, NOW).nextAttemptAt).toEqual(minutesLater(30));
    expect(planAfterFailure(4, NOW).nextAttemptAt).toEqual(minutesLater(120));
  });

  it('gives up at the attempt limit', () => {
    expect(MAX_ATTEMPTS).toBe(5);
    expect(planAfterFailure(5, NOW)).toEqual({
      status: 'failed',
      nextAttemptAt: null
    });
    expect(planAfterFailure(9, NOW).status).toBe('failed');
  });

  it('never retries when retry is off (the test event)', () => {
    expect(planAfterFailure(1, NOW, false)).toEqual({
      status: 'failed',
      nextAttemptAt: null
    });
  });
});
