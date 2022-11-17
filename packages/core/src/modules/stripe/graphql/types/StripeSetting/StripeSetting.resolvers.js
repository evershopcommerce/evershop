module.exports = {
  Setting: {
    stripePaymentStatus: (setting, { _ }, { pool }) => {
      const stripePaymentStatus = setting.find(s => s.name === 'stripePaymentMethod');
      if (stripePaymentStatus) {
        return parseInt(stripePaymentStatus.value);
      } else {
        return 0;
      }
    },
    stripeDislayName: (setting, { _ }, { pool }) => {
      const stripeDislayName = setting.find(s => s.name === 'stripeDislayName');
      if (stripeDislayName) {
        return stripeDislayName.value;
      } else {
        return 'Credit Card';
      }
    },
    stripePublishableKey: (setting, { _ }, { tokenPayload }) => {
      const stripePublishableKey = setting.find(s => s.name === 'stripePublishableKey');
      if (stripePublishableKey) {
        return stripePublishableKey.value;
      } else {
        return null;
      }
    },
    stripeSecretKey: (setting, { _ }, { tokenPayload }) => {
      const stripeSecretKey = setting.find(s => s.name === 'stripeSecretKey');
      if (stripeSecretKey) {
        return stripeSecretKey.value;
      } else {
        return null;
      }
    }
  }
}