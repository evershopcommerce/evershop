const jest = require('jest-mock');
const errorHandler = require('../../../../../../../../modules/base/pages/global/[response]errorHandler');

module.exports = jest.fn(errorHandler);
