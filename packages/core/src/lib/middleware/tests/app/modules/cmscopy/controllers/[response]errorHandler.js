const errorHandler = require('../../../../../../../modules/cms/controllers/[response]errorHandler');
const jest = require('jest-mock');

module.exports = jest.fn(errorHandler);