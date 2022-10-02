const { getConfig } = require("../../../../../lib/util/getConfig")
const { DateTime } = require('luxon');

module.exports = {
  DateTime: {
    value: (dateTime) => dateTime,
    timezone: () => getConfig('shop.timezone', 'UTC'),
    text: (value, { format = 'LLL dd yyyy' }, context) => {
      if (!DateTime.fromSQL(value).isValid) {
        return null;
      }
      const timeZone = getConfig('shop.timezone', 'UTC');
      const language = getConfig('shop.language', 'en');
      const date = DateTime.fromSQL(value, { zone: timeZone }).setLocale(language).setZone(timeZone).toFormat(format);
      return date;
    }
  }
}