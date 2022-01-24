var bodyParser = require('body-parser')

module.exports = (request, response, stack, next) => {
    console.log('webhook')
    bodyParser.raw({ type: '*/*' })(request, response, next);
}