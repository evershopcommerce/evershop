const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { getConfig } = require('../../../../../lib/util/getConfig');
const { setContextValue } = require('../../../../graphql/services/buildContext');

module.exports = async (request, response) => {
  setContextValue('pageInfo', {
    title: getConfig('shop.description', 'EverShop'),
    description: getConfig('shop.description', 'An e-commerce platform with Node and MySQL'),
    url: buildUrl('homepage')
  });
};
