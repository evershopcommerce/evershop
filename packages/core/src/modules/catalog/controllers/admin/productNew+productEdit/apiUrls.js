const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = (request, response) => {
  // Add uploadUrl to app context
  assign(response.context, { productImageUploadUrl: buildUrl('imageUpload', ['']) });
  assign(response.context, { searchVariantUrl: buildUrl('variantSearch', []) });
  assign(response.context, { unlinkVariant: buildUrl('unlinkVariant', []) });
};
