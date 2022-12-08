module.exports = {
  Setting: {
    codPaymentStatus: (setting, { _ }, { pool }) => {
      const codPaymentStatus = setting.find(s => s.name === 'codPaymentStatus');
      if (codPaymentStatus) {
        return parseInt(codPaymentStatus.value);
      } else {
        return 0;
      }
    },
    codDislayName: (setting, { _ }, { pool }) => {
      const codDislayName = setting.find(s => s.name === 'codDislayName');
      if (codDislayName) {
        return codDislayName.value;
      } else {
        return 'Cash On Delivery';
      }
    }
  }
};