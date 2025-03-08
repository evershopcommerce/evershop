const createAccount = require('../../services/account/createAccount');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate) => {

  const result = await createAccount(request.body, {
    productUuid: request.params.id
  });
  return result;
};
