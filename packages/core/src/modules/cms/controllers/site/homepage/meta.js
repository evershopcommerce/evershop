const { getConfig } = require('../../../../../lib/util/getConfig');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response) => {
  assign(response.context, { metaTitle: getConfig('shop.title', 'NodeJS Cart'), metaDescription: getConfig('shop.description', 'An E-commerce platform using ReactJs and MySQL') });
};
