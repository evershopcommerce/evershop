const { contries } = require('@evershop/evershop/src/lib/locale/countries');
const { getSetting } = require('../../../../setting/services/setting');
const { provinces } = require('@evershop/evershop/src/lib/locale/provinces');

module.exports = {
  Query: {
    countries: (_, argument) => {
      const list = argument?.countries || [];
      if (list.length === 0) {
        return contries;
      } else {
        return contries.filter((c) => list.includes(c.code));
      }
    },
    allowedCountries: async () => {
      const allowedCountries = await getSetting('allowedCountries', '["US"]');
      const list = JSON.parse(allowedCountries);
      return contries.filter((c) => list.includes(c.code));
    }
  },
  Country: {
    name: (country) => {
      if (country.name) {
        return country.name;
      } else {
        const c = contries.find((p) => p.code === country);
        return c.name;
      }
    },
    code: (country) => {
      if (country.code) {
        return country.code;
      } else {
        return country;
      }
    },
    provinces: (country) =>
      provinces.filter((p) => p.countryCode === country.code)
  }
};
