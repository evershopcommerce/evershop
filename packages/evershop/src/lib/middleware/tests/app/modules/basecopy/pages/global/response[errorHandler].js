const jest = require('jest-mock');
const response = require('../../../../../../../../modules/base/pages/global/response[errorHandler]');

module.exports = jest.fn(response);
