const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { OK } = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, delegate, next) => {
  const category = await delegate.createAccount;
  response.status(OK);
  response.json({
    data: {
      ...category
    }
  });
};
