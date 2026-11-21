/**
 * Numbers and dates as the browser of the admin writes them. Used only after the
 * page has loaded its data in the browser, so the server render never differs.
 */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat().format(value);

/**
 * A date and a time, in the time zone of the store (like the other admin pages,
 * which show the store's time) when it is known and valid, else the browser's.
 */
export function formatDateTime(
  iso: string | null,
  timeZone?: string | null
): string {
  if (iso === null) return '--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short'
  };
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        ...options,
        timeZone
      }).format(date);
    } catch {
      // An unknown time zone name: fall through to the browser's.
    }
  }
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/** 12.4 MB, 830 KB, 5 MB: the size of a file as people say it. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 100, none above; a whole number has no decimal at all.
  const rounded = value < 100 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${units[unit]}`;
}
