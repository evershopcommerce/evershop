import multer from 'multer';

const upload = multer();

export default (request, response, next) => {
  upload.none()(request, response, next);
};
