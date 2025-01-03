const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Query: {
    statusList: () => {
      const statusList = getConfig('oms.order.status', {});
      return Object.keys(statusList).map((key) => ({
        ...statusList[key],
        code: key
      }));
    },
    shipmentStatusList: () => {
      const statusList = getConfig('oms.order.shipmentStatus', {});
      return Object.keys(statusList).map((key) => ({
        ...statusList[key],
        code: key
      }));
    },
    paymentStatusList: () => {
      const statusList = getConfig('oms.order.paymentStatus', {});
      return Object.keys(statusList).map((key) => ({
        ...statusList[key],
        code: key
      }));
    }
  }
};
