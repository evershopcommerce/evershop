const multer = require('multer');

const upload = multer();

module.exports = (request, response, stack, next) => {
  upload.none()(request, response, next);
};
