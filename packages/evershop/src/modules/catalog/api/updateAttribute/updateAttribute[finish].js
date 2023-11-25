const updateProductAttribute = require('../../services/attribute/updateProductAttribute');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {
  const result = await updateProductAttribute(request.params.id, request.body);
  return result;
};
