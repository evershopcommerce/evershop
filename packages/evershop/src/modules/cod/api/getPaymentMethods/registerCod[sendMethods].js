const { getSetting } = require('../../../setting/services/setting');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  // Check if COD is enabled
  const codStatus = await getSetting('codPaymentStatus', 0);
  if (parseInt(codStatus, 10) === 1) {
    return {
      methodCode: 'cod',
      methodName: await getSetting('codDislayName', 'Cash On Delivery')
    };
  } else {
    return null;
  }
};
