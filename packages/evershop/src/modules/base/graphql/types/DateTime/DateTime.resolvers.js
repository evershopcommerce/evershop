const { DateTime } = require('luxon');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  DateTime: {
    value: (dateTime) => dateTime,
    timezone: async () => {
      const timeZone = getConfig('shop.timezone', 'UTC');
      return timeZone;
    },
    text: async (value, { format = 'yyyy-LL-dd' }) => {
      if (!DateTime.fromJSDate(value).isValid) {
        return null;
      }
      const timeZone = getConfig('shop.timezone', 'UTC');
      const language = getConfig('shop.language', 'en');
      const date = DateTime.fromJSDate(value, { zone: timeZone })
        .setLocale(language)
        .setZone(timeZone)
        .toFormat(format);
      return date;
    }
  }
};
