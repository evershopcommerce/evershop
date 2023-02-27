const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Query: {
    shipmentStatusList: () => {
      const statusList = getConfig('order.shipmentStatus', []);
      return statusList.map((status) => status.code);
    },
    paymentStatusList: () => {
      const statusList = getConfig('order.paymentStatus', []);
      return statusList.map((status) => status.code);
    }
  },
  ShipmentStatus: {
    code: (code) => code,
    name: (code) => {
      const list = getConfig('order.shipmentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.name : null;
    },
    badge: (code) => {
      const list = getConfig('order.shipmentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.badge : null;
    },
    progress: (code) => {
      const list = getConfig('order.shipmentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.progress : null;
    }
  },
  PaymentStatus: {
    code: (code) => code,
    name: (code) => {
      const list = getConfig('order.paymentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.name : null;
    },
    badge: (code) => {
      const list = getConfig('order.paymentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.badge : null;
    },
    progress: (code) => {
      const list = getConfig('order.paymentStatus', []);
      const status = list.find((s) => s.code === code);
      return status ? status.progress : null;
    }
  }
};
