export default {
  Setting: {
    codPaymentStatus: (setting) => {
      const codPaymentStatus = setting.find(
        (s) => s.name === 'codPaymentStatus'
      );
      if (codPaymentStatus) {
        return parseInt(codPaymentStatus.value, 10);
      } else {
        return 0;
      }
    },
    codDisplayName: (setting) => {
      const codDisplayName = setting.find((s) => s.name === 'codDisplayName');
      if (codDisplayName) {
        return codDisplayName.value;
      } else {
        return 'Cash On Delivery';
      }
    }
  }
};
