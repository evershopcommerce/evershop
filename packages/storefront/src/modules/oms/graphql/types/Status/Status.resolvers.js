import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
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
