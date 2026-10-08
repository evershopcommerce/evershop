import { BACKOFF_MINUTES, MAX_ATTEMPTS } from './constants.js';

export type FailurePlan = {
  /** `pending` = try again later, `failed` = give up. */
  status: 'pending' | 'failed';
  nextAttemptAt: Date | null;
};

/**
 * What happens to a delivery after a failed attempt.
 *
 * @param attempts Attempts made so far, INCLUDING the one that just failed.
 * @param retry    False for a test event: it fails at once, no retry.
 */
export function planAfterFailure(
  attempts: number,
  now: Date,
  retry: boolean = true
): FailurePlan {
  if (!retry || attempts >= MAX_ATTEMPTS) {
    return { status: 'failed', nextAttemptAt: null };
  }
  const minutes =
    BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1] ??
    BACKOFF_MINUTES[0];
  return {
    status: 'pending',
    nextAttemptAt: new Date(now.getTime() + minutes * 60 * 1000)
  };
}
