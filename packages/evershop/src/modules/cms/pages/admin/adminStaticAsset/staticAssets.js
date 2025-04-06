import staticMiddleware from '@evershop/evershop/src/lib/middlewares/static.js';

export default (request, response, stack, next) => {
  staticMiddleware(request, response, next);
};
