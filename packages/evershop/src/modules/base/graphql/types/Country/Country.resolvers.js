const { contries } = require("../../../../../lib/locale/countries")

module.exports = {
  Query: {
    countries: (_, argument) => {
      let list = argument?.countries || [];
      if (list.length === 0) {
        return contries
      } else {
        return contries.filter((c) => list.includes(c.code));
      }
    }
  },
  Country: {
    name: (country) => {
      if (country.name) {
        return country.name
      } else {
        const c = contries.find((p) => p.code === country);
        return c.name;
      }
    },
    code: (country) => {
      if (country.code) {
        return country.code
      } else {
        return country;
      }
    }
  }
}