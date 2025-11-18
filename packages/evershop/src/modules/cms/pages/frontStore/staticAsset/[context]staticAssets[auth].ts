import staticMiddleware from '../../../../../lib/middlewares/static.js';

export default async (request, response, next) => {
  await staticMiddleware(request, response, next);
};
