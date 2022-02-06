const logger = require('../log/logger');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

const stack = {
  delegates: [],
  middlewares: [
    {
      id: 'cleanDelegations',
      routeId: null,
      before: null,
      after: null,
      middleware(request, response, next) {
        const route = request.currentRoute;
        stack.delegates[route.id] = [];
        logger.log('info', `REQUEST ${request.originalUrl}`);
        next();
      }
    }
  ]
};

exports.stack = stack;
