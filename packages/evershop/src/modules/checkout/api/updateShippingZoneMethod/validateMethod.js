const validate = require('../addShippingZoneMethod/validateMethod');

module.exports = async (request, response, deledate, next) => validate(request, response, deledate, next);
