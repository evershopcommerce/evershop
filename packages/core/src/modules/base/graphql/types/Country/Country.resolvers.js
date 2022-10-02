const { contries } = require("../../../../../lib/locale/countries")

module.exports = {
  Country: {
    name: (code) => {
      const country = contries.find((c) => c.value === code);
      return country.text;
    },
    code: (code) => code
  }
}