const { get } = require('../../../../../lib/util/get');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async (request, response, stack) => {
  await stack.grid;

  const orders = get(response.context, 'grid.orders', []);
  orders.forEach(function (el, index) {
    this[index].editUrl = buildUrl('orderEdit', { id: parseInt(this[index].order_id, 10) });
    this[index].createShipmentUrl = buildUrl('createShipment', { orderId: parseInt(this[index].order_id, 10) });
  }, orders);
};
