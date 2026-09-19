import { DateTime } from 'luxon';
import { getActiveLocale } from '../../../../../lib/locale/localeContext.js';
import { getStoreTimezone } from '../../../../setting/services/setting.js';

export default {
  DateTime: {
    value: (dateTime) => dateTime,
    // Display timezone (admin setting `storeTimeZone`), falling back to the operational
    // `shop.timezone` config when unset. NOT the DB-session timezone.
    timezone: () => getStoreTimezone(),
    text: (value, { format = 'yyyy-LL-dd' }) => {
      if (!DateTime.fromJSDate(value).isValid) {
        return null;
      }
      const timeZone = getStoreTimezone();
      // Request locale, falling back to the `storeLanguage` admin setting. Drives the
      // month/weekday names Luxon substitutes for LLL/LLLL/ccc/cccc tokens; the DEFAULT
      // `format` below is numeric ISO, so callers only see a difference once they pass a
      // format that spells a name out.
      const language = getActiveLocale();
      const date = DateTime.fromJSDate(value, { zone: timeZone })
        .setLocale(language)
        .setZone(timeZone)
        .toFormat(format);
      return date;
    }
  }
};
