import { describe, it, expect } from '@jest/globals';
import cron from 'node-cron';
import { randomSecond, spreadSchedule } from '../../spreadSchedule.js';

// The schedules core registers today (webhook, import, Stripe, PayPal,
// sitemap, recommendations), each with the minutes it matches.
const CORE_SCHEDULES: Array<[string, (run: Date) => boolean]> = [
  ['* * * * *', () => true],
  ['*/10 * * * *', (run) => run.getMinutes() % 10 === 0],
  ['*/15 * * * *', (run) => run.getMinutes() % 15 === 0],
  ['*/30 * * * *', (run) => run.getMinutes() % 30 === 0],
  ['0 2 * * *', (run) => run.getHours() === 2 && run.getMinutes() === 0]
];

describe('spreadSchedule', () => {
  it('puts the second in front of a five-field schedule', () => {
    expect(spreadSchedule('*/30 * * * *', 37)).toBe('37 */30 * * * *');
    expect(spreadSchedule('* * * * *', 0)).toBe('0 * * * * *');
  });

  it('accepts extra spaces around and between the fields', () => {
    expect(spreadSchedule('  0   2 * * * ', 5)).toBe('5 0 2 * * *');
  });

  it('keeps a schedule that already names its second', () => {
    expect(spreadSchedule('15 * * * * *', 40)).toBe('15 * * * * *');
  });

  it('keeps any other form as it is', () => {
    expect(spreadSchedule('@daily', 3)).toBe('@daily');
    expect(spreadSchedule('0 2 * *', 3)).toBe('0 2 * *');
  });

  it('gives node-cron a schedule that runs at that second of every minute it matched before', () => {
    // Checked run by run, not against the old schedule's next runs: before
    // second 37 of a matching minute, the spread job still runs in that
    // minute, while the old one already ran at its second 0.
    CORE_SCHEDULES.forEach(([schedule, matchesMinute]) => {
      const spread = spreadSchedule(schedule, 37);
      expect(cron.validate(spread)).toBe(true);
      const task = cron.createTask(spread, () => undefined);
      const runs = task.getNextRuns(3);
      task.destroy();
      expect(runs).toHaveLength(3);
      expect(runs.map((run) => run.getSeconds())).toEqual([37, 37, 37]);
      expect(runs.every(matchesMinute)).toBe(true);
    });
  });
});

describe('randomSecond', () => {
  it('maps the random number onto a whole second from 0 to 59', () => {
    expect(randomSecond(() => 0)).toBe(0);
    expect(randomSecond(() => 0.5)).toBe(30);
    expect(randomSecond(() => 0.999999)).toBe(59);
  });

  it('uses Math.random by default, and stays within 0 to 59', () => {
    for (let i = 0; i < 1000; i += 1) {
      const second = randomSecond();
      expect(Number.isInteger(second)).toBe(true);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThanOrEqual(59);
    }
  });
});
