import type { Clock } from '../services/ports/clock.js';

/**
 * The real `Clock` (§ 4.5): the system time, a timer for `sleep`, and an
 * interval for the heartbeat. The interval does not overlap itself on purpose:
 * a tick that is still at work when the next one is due is the session's
 * business (it skips), and an error in a tick is never thrown at the timer.
 */
export const systemClock: Clock = {
  now: () => Date.now(),

  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),

  interval(ms, work) {
    const timer = setInterval(() => {
      Promise.resolve()
        .then(work)
        .catch(() => undefined);
    }, ms);
    return () => clearInterval(timer);
  }
};
