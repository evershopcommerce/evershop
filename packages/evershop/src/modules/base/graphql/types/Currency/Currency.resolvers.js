const { currencies } = require('@evershop/evershop/src/lib/locale/currencies');

module.exports = {
  Query: {
    currencies: () => currencies
  }
};
