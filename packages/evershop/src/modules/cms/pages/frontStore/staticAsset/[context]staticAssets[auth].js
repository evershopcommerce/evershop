import staticMiddleware from '../../../../../lib/middlewares/static.js';

export default (request, response, delegate, next) => {
  staticMiddleware(request, response, next);
};
