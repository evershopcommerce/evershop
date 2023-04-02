const { DateTime } = require('luxon');
const { getSetting } = require('../../../../setting/services/setting');

module.exports = {
  DateTime: {
    value: (dateTime) => dateTime,
    timezone: async () => {
      const timeZone = await getSetting('storeTimeZone', 'UTC');
      return timeZone;
    },
    text: async (value, { format = 'yyyy-LL-dd' }) => {
      if (!DateTime.fromJSDate(value).isValid) {
        return null;
      }
      const timeZone = await getSetting('storeTimeZone', 'UTC');
      const language = await getSetting('storeLanguage', 'en');
      const date = DateTime.fromJSDate(value, { zone: timeZone })
        .setLocale(language)
        .setZone(timeZone)
        .toFormat(format);
      return date;
    }
  }
};
