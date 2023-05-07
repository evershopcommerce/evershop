const { timezones } = require('@evershop/evershop/src/lib/locale/timezones');

module.exports = {
  Query: {
    timezones: () => timezones
  }
};
