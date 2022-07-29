const { getConfig } = require('../../../../../lib/util/getConfig');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response) => {
  assign(response.context, { metaTitle: getConfig('shop.title', 'EverShop'), metaDescription: getConfig('shop.description', 'An e-commerce platform with Node and MySQL') });
};
