const createLanguage = require('../../services/createLanguage');

module.exports = async (request) => {
  const result = await createLanguage(request.body, {
    routeId: request.currentRoute.id
  });
  return result;
};
