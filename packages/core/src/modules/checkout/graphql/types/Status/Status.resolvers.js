const { getConfig } = require("../../../../../lib/util/getConfig");

module.exports = {
  Query: {
    shipmentStatusList: () => getConfig('order.shipmentStatus', []),
    paymentStatusList: () => getConfig('order.paymentStatus', []),
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
}
