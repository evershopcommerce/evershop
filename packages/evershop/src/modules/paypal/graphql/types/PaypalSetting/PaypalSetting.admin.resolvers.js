import { getConfig } from '../../../../../lib/util/getConfig.js';
import { isPaymentMethodEnabled } from '../../../services/paymentMethods.js';

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
    paypalVenmoStatus: (setting) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.venmoStatus !== undefined) {
        return isPaymentMethodEnabled(paypalConfig.venmoStatus) ? 1 : 0;
      }
      const paypalVenmoStatus = setting.find(
        (s) => s.name === 'paypalVenmoStatus'
      );
      if (paypalVenmoStatus) {
        return parseInt(paypalVenmoStatus.value, 10);
      } else {
        return 0;
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
