/**
 * A time that is written differently in the time zone of the store and in the one
 * of the machine that runs the tests, whatever that machine's zone is: the page
 * must show the store's.
 */
export const INSTANT = '2026-10-19T09:00:00.000Z';

const write = (zone?: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone
  }).format(new Date(INSTANT));

/** The instant as the browser of this machine writes it. */
export const browserTime = write();

/** A zone, other than this machine's, in which the instant is written differently. */
export const STORE_ZONE = [
  'Asia/Ho_Chi_Minh',
  'America/New_York',
  'Pacific/Auckland'
].find((zone) => write(zone) !== browserTime)!;

/** The instant as the store writes it. */
export const storeTime = write(STORE_ZONE);
