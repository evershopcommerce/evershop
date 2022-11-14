module.exports = {
  Setting: {
    stripePaymentStatus: (setting, { _ }, { pool }) => {
      const stripePaymentStatus = setting.find(s => s.name === 'stripePaymentMethod');
      if (stripePaymentStatus) {
        return parseInt(stripePaymentStatus.value) === 1;
      } else {
        return false;
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
    stripePublisableKey: (setting, { _ }, { tokenPayload }) => {
      const stripePublishableKey = setting.find(s => s.name === 'stripePublishableKey');
      if (stripePublishableKey) {
        return stripePublishableKey.value;
      } else {
        return null;
      }
    }
  }
}