const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { setContextValue } = require('../../../../graphql/services/contextHelper');
const { getSetting } = require('../../../../setting/services/setting');

module.exports = async (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: await getSetting('storeName', 'EverShop'),
    description: await getSetting('storeDescription', 'An e-commerce platform with Node and MySQL'),
    url: buildUrl('homepage')
  });
};
