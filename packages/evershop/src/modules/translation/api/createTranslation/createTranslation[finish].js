const createTranslation = require('../../services/translation/createTranslation');

module.exports = async (request) => {
  const result = await createTranslation(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
