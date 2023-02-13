const errorHandler = require('../../../../../../../../modules/base/pages/global/[response]errorHandler');
const jest = require('jest-mock');

module.exports = jest.fn(errorHandler);
