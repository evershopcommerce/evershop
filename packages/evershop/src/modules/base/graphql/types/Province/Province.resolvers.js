const { provinces } = require("../../../../../lib/locale/provinces");

module.exports = {
  Query: {
    provinces: (_, { countries = [] }) => {
      if (countries.length === 0) {
        return provinces
      } else {
        return provinces.filter((p) => countries.includes(p.countryCode));
      }
    }
  },
  Province: {
    name: (province) => {
      if (province.name) {
        return province.name
      } else {
        const p = provinces.find((p) => p.code === province);
        return p.name;
      }
    },
    countryCode: (province) => {
      if (province.countryCode) {
        return province.countryCode
      } else {
        const p = provinces.find((p) => p.code === province);
        return p.countryCode;
      }
    },
    code: (province) => {
      if (province.code) {
        return province.code
      } else {
        return province;
      }
    }
  }
}