const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Query: {
    shipmentStatusList: () => {
      const statusList = getConfig('checkout.order.shipmentStatus', []);
      return statusList.map((status) => status.code);
    },
    paymentStatusList: () => {
      const statusList = getConfig('checkout.order.paymentStatus', []);
      return statusList.map((status) => status.code);
    }
  },
  ShipmentStatus: {
    code: (code) => code,
    name: (code) => {
      const list = getConfig('checkout.order.shipmentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.name : null;
    },
    badge: (code) => {
      const list = getConfig('checkout.order.shipmentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.badge : null;
    },
    progress: (code) => {
      const list = getConfig('checkout.order.shipmentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.progress : null;
    }
  },
  PaymentStatus: {
    code: (code) => code,
    name: (code) => {
      const list = getConfig('checkout.order.paymentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.name : null;
    },
    badge: (code) => {
      const list = getConfig('checkout.order.paymentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.badge : null;
    },
    progress: (code) => {
      const list = getConfig('checkout.order.paymentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.progress : null;
    }
  }
};
