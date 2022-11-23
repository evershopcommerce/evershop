const { timezones } = require("../../../../../lib/locale/timezones")

module.exports = {
  Query: {
    timezones: () => {
      return timezones;
    }
  }
}