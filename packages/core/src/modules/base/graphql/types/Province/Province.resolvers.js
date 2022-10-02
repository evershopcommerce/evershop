const { provinces } = require("../../../../../lib/locale/provinces");

module.exports = {
  Province: {
    name: (code) => {
      const province = provinces.find((p) => p.value === code);
      return province.text;
    },
    code: (code) => code
  }
}