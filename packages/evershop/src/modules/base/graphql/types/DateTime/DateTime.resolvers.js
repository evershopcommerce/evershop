import { DateTime } from 'luxon';
import { getConfig } from '../../../../../lib/util/getConfig.js';
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
      const language = getConfig('shop.language', 'en');
      const date = DateTime.fromJSDate(value, { zone: timeZone })
        .setLocale(language)
        .setZone(timeZone)
        .toFormat(format);
      return date;
    }
  }
};
