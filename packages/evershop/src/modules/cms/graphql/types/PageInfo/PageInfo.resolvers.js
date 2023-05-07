const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = {
  Query: {
    // TODO To be updated, API should be stateless
    pageInfo: (root, args, context) => ({
      url: get(context, 'currentUrl'),
      title: get(context, 'pageInfo.title', ''),
      description: get(context, 'pageInfo.description', ''),
      keywords: get(context, 'pageInfo.keywords', '')
    })
  }
};
