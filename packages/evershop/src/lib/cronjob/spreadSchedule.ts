/**
 * Gives a job a second of its own within the minute.
 *
 * A five-field schedule runs at second 0 of each minute it matches, so every
 * job due in the same minute starts in the same second. At :00 and :30 core
 * starts seven jobs at once (webhook deliveries, three import jobs, the
 * Stripe and PayPal reconciliations, the sitemap), each with its own database
 * connection, and every store that shares a database server does the same in
 * the same second.
 *
 * node-cron takes a sixth, leading field for the second. So when the cron
 * process starts, it puts a random second (0 to 59) in front of each
 * five-field schedule: `0,30 * * * *` becomes, for example,
 * `37 0,30 * * * *`. The job still runs once in each minute it matches, at
 * most 59 seconds later than before. The second is picked once per job and
 * kept until the process restarts; it needs nothing from the setup (one store
 * or many, one database server or several).
 *
 * A schedule that already names its second (six fields) is kept as it is:
 * its author chose the moment.
 */
export function spreadSchedule(schedule: string, second: number): string {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) {
    return schedule;
  }
  return `${second} ${fields.join(' ')}`;
}

/** A whole second from 0 to 59. */
export function randomSecond(random: () => number = Math.random): number {
  return Math.min(59, Math.floor(random() * 60));
}
