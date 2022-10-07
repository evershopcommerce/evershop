const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { getConfig } = require('../../../../../lib/util/getConfig');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: getConfig('shop.description', 'EverShop'),
    description: getConfig('shop.description', 'An e-commerce platform with Node and MySQL'),
    url: buildUrl('homepage')
  });
};
