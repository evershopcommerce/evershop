const { provinces } = require('@evershop/evershop/src/lib/locale/provinces');

module.exports = {
  Query: {
    provinces: (_, { countries = [] }) => {
      if (countries.length === 0) {
        return provinces;
      } else {
        return provinces.filter((p) => countries.includes(p.countryCode));
      }
    }
  },
  Province: {
    name: (province) => {
      if (province.name) {
        return province.name;
      } else {
        const p = provinces.find((pr) => pr.code === province);
        return p?.name || 'INVALID_PROVINCE';
      }
    },
    countryCode: (province) => {
      if (province.countryCode) {
        return province.countryCode;
      } else {
        const p = provinces.find((pr) => pr.code === province);
        return p?.countryCode || 'INVALID_PROVINCE';
      }
    },
    code: (province) => {
      if (province?.code) {
        return province?.code;
      } else {
        return province || 'INVALID_PROVINCE';
      }
    }
  }
};
