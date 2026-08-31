import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    paypalPaymentStatus: (setting) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.status) {
        return paypalConfig.status;
      }
      const paypalPaymentStatus = setting.find(
        (s) => s.name === 'paypalPaymentStatus'
      );
      if (paypalPaymentStatus) {
        return parseInt(paypalPaymentStatus.value, 10);
      } else {
        return 0;
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
    paypalClientSecret: (setting, _, { user }) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.clientSecret) {
        return '*******************************';
      }
      if (user) {
        const paypalClientSecret = setting.find(
          (s) => s.name === 'paypalClientSecret'
        );
        if (paypalClientSecret) {
          return paypalClientSecret.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    paypalWebhookId: (setting, _, { user }) => {
      // A webhook id is an identifier, not a secret — show the config value
      // as-is so the admin can see which webhook is wired.
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.webhookId) {
        return paypalConfig.webhookId;
      }
      if (user) {
        const paypalWebhookId = setting.find(
          (s) => s.name === 'paypalWebhookId'
        );
        if (paypalWebhookId) {
          return paypalWebhookId.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }
};
