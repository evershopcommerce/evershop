var multer = require('multer')
var upload = multer()

module.exports = (request, response, stack, next) => {
    upload.none()(request, response, next);
}