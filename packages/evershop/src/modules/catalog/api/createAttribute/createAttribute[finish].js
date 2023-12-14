const createProductAttribute = require('../../services/attribute/createProductAttribute');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const attribute = await createProductAttribute(request.body, {
    routeId: request.currentRoute.id
  });
  return attribute;
};
