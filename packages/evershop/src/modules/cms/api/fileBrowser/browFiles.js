const { OK } = require('@evershop/evershop/src/lib/util/httpStatus');
const { browFiles } = require('../../services/browFiles');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const path = request.params[0] || '';
  const results = await browFiles(path);
  response.status(OK);
  response.json({
    data: results
  });
};
