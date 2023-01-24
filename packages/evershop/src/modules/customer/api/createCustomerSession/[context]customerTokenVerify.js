const customerTokenVerify = require('../../pages/frontStore/all/[context]customerTokenVerify');

module.exports = async (request, response, delegate, next) => {
  customerTokenVerify(request, response, delegate, next);
};
