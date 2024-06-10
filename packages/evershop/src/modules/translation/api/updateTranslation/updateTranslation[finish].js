const updateTranslation = require('../../services/translation/updateTranslation');

module.exports = async (request) => {
  const result = await updateTranslation(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
