const { getSetting } = require('../../../setting/services/setting');

module.exports = async (request, response) => {
  // Check if COD is enabled
  const codStatus = await getSetting('codPaymentStatus', 0);
  if (parseInt(codStatus) === 1) {
    return {
      methodCode: 'cod',
      methodName: await getSetting('codDislayName', 'Cash On Delivery')
    };
  } else {

  }
};
