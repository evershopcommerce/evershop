import staticMiddleware from '../../../../../lib/middlewares/static.js';

export default (request, response, next) => {
  staticMiddleware(request, response, next);
};
