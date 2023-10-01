const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Setting: {
    paypalDislayName: (setting) => {
      const paypalDislayName = setting.find(
        (s) => s.name === 'paypalDislayName'
      );
      if (paypalDislayName) {
        return paypalDislayName.value;
      } else {
        return 'Paypal';
      }
    },
    paypalEnvironment: (setting) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.environment) {
        return paypalConfig.environment;
      }
      const paypalEnvironment = setting.find(
        (s) => s.name === 'paypalEnvironment'
      );
      if (paypalEnvironment) {
        return paypalEnvironment.value;
      } else {
        return 'https://api-m.sandbox.paypal.com';
      }
    }
  }
};
