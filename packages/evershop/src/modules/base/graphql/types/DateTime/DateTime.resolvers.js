const { DateTime } = require('luxon');
const { getSetting } = require("../../../../setting/services/setting");

module.exports = {
  DateTime: {
    value: (dateTime) => dateTime,
    timezone: async () => await getSetting('storeTimeZone', 'UTC'),
    text: async (value, { format = 'LLL dd yyyy' }, context) => {
      if (!DateTime.fromSQL(value).isValid) {
        return null;
      }
      const timeZone = await getSetting('storeTimeZone', 'UTC');
      const language = await getSetting('storeLanguage', 'en');
      const date = DateTime.fromSQL(value, { zone: timeZone }).setLocale(language).setZone(timeZone).toFormat(format);
      return date;
    }
  }
}