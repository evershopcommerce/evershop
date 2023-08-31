const { execute } = require('graphql');
const { parse } = require('graphql');
const { validate } = require('graphql/validation');
const isDevelopmentMode = require('@evershop/evershop/src/lib/util/isDevelopmentMode');
let schema = require('../../services/buildSchema');
const { getContext } = require('../../services/contextHelper');

module.exports = async function graphql(request, response, delegate, next) {
  // TODO: Should we wait for previous async middlewares?
  try {
    const { body } = request;
    const { graphqlQuery, graphqlVariables, propsMap } = body;
    if (!graphqlQuery) {
      next();
    } else {
      // Try remove all white space and line break
      const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');
      if (query === 'queryQuery{}') {
        // TODO: oh no, so dirty. find a better way to check if the query is empty
        next();
      } else {
        const document = parse(graphqlQuery);
        // Validate the query
        const validationErrors = validate(schema, document);
        if (validationErrors.length > 0) {
          next(validationErrors[0]);
        } else {
          if (isDevelopmentMode()) {
            // eslint-disable-next-line global-require
            schema = require('../../services/buildSchema');
          }
          const context = getContext(request);
          // Add current user to context
          context.user = request.locals.user;
          // Add current customer to context
          context.customer = request.locals.customer;
          const data = await execute({
            schema,
            contextValue: context,
            document,
            variableValues: graphqlVariables
          });
          if (data.errors) {
            next(data.errors[0]);
          } else {
            response.locals = response.locals || {};
            response.locals.graphqlResponse = JSON.parse(
              JSON.stringify(data.data)
            );
            // Get id and props from the queryRaw object and assign to response.locals.propsMap
            response.locals.propsMap = propsMap;
            next();
          }
        }
      }
    }
  } catch (error) {
    next(error);
  }
};
