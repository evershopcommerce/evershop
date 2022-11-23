const { currencies } = require("../../../../../lib/locale/currencies")

module.exports = {
  Query: {
    currencies: () => {
      return currencies;
    }
  }
}