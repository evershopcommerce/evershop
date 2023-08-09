const {
  loadCsv
} = require('@evershop/evershop/src/lib/locale/translate/translate');

module.exports = async () => {
  await loadCsv();
};
