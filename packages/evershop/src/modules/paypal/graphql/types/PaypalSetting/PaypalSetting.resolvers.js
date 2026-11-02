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
    paypalPaymentIntent: (setting) => {
      const paypalPaymentIntent = setting.find(
        (s) => s.name === 'paypalPaymentIntent'
      );
      if (paypalPaymentIntent) {
        return paypalPaymentIntent.value;
      } else {
        return 'CAPTURE';
      }
    },
    paypalClientId: (setting) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.clientId) {
        return paypalConfig.clientId;
      }
      const paypalClientId = setting.find((s) => s.name === 'paypalClientId');
      if (paypalClientId) {
        return paypalClientId.value;
      } else {
        return null;
      }
    },
    paypalVenmoDisplayName: (setting) => {
      const paypalVenmoDisplayName = setting.find(
        (s) => s.name === 'paypalVenmoDisplayName'
      );
      if (paypalVenmoDisplayName) {
        return paypalVenmoDisplayName.value;
      } else {
        return 'Venmo';
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
