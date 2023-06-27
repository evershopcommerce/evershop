const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  setContextValue
} = require('../../../../graphql/services/contextHelper');
const { getSetting } = require('../../../../setting/services/setting');

module.exports = async (request, response, delegate, next) => {
  setContextValue(request, 'pageInfo', {
    title: await getSetting('storeName', 'EverShop'),
    description: await getSetting(
      'storeDescription',
      'An e-commerce platform with Node and Postgres'
    ),
    url: buildUrl('homepage')
  });

  next();
};
