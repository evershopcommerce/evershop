import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    paypalDisplayName: (setting) => {
      const paypalDisplayName = setting.find(
        (s) => s.name === 'paypalDisplayName'
      );
      if (paypalDisplayName) {
        return paypalDisplayName.value;
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
