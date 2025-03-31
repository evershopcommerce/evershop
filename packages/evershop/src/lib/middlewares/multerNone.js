import multer from 'multer';

const upload = multer();

export default (request, response, stack, next) => {
  upload.none()(request, response, next);
};
