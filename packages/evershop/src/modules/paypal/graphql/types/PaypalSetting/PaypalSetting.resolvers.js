const { getConfig } = require("../../../../../lib/util/getConfig");

module.exports = {
  Setting: {
    paypalPaymentStatus: (setting, { _ }, { pool }) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.status) {
        return paypalConfig.status;
      }
      const paypalPaymentStatus = setting.find(s => s.name === 'paypalPaymentStatus');
      if (paypalPaymentStatus) {
        return parseInt(paypalPaymentStatus.value);
      } else {
        return 0;
      }
    },
    paypalDislayName: (setting, { _ }, { pool }) => {
      const paypalDislayName = setting.find(s => s.name === 'paypalDislayName');
      if (paypalDislayName) {
        return paypalDislayName.value;
      } else {
        return 'Paypal';
      }
    },
    paypalPaymentIntent: (setting, { _ }, { pool }) => {
      const paypalPaymentIntent = setting.find(s => s.name === 'paypalPaymentIntent');
      if (paypalPaymentIntent) {
        return paypalPaymentIntent.value;
      } else {
        return 'CAPTURE';
      }
    },
    paypalClientId: (setting, { _ }, { tokenPayload }) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.clientId) {
        return paypalConfig.clientId;
      }
      const paypalClientId = setting.find(s => s.name === 'paypalClientId');
      if (paypalClientId) {
        return paypalClientId.value;
      } else {
        return null;
      }
    },
    paypalClientSecret: (setting, { _ }, { tokenPayload }) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.clientSecret) {
        return '*******************************';
      }
      if (tokenPayload && tokenPayload?.user?.isAdmin === true) {
        const paypalClientSecret = setting.find(s => s.name === 'paypalClientSecret');
        if (paypalClientSecret) {
          return paypalClientSecret.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    paypalWebhookSecret: (setting, { _ }, { tokenPayload }) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.webhookSecret) {
        return '*******************************';
      }
      if (tokenPayload && tokenPayload?.user?.isAdmin === true) {
        const paypalWebhookSecret = setting.find(s => s.name === 'paypalWebhookSecret');
        if (paypalWebhookSecret) {
          return paypalWebhookSecret.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    paypalEnvironment: (setting, { _ }, { tokenPayload }) => {
      const paypalConfig = getConfig('system.paypal', {});
      if (paypalConfig.environment) {
        return paypalConfig.environment;
      }
      const paypalEnvironment = setting.find(s => s.name === 'paypalEnvironment');
      if (paypalEnvironment) {
        return paypalEnvironment.value;
      } else {
        return 'https://api-m.sandbox.paypal.com';
      }
    }
  }
}