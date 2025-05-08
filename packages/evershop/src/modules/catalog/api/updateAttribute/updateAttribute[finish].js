const updateProductAttribute = require('../../services/attribute/updateProductAttribute');

module.exports = async (request, response, delegate) => {
  const result = await updateProductAttribute(request.params.id, request.body);
  return result;
};
