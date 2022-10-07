var schema = require('../../services/buildSchema');
const { getContext } = require('../../services/contextHelper');
const { execute } = require('graphql');
const { parse } = require('graphql');
const isDevelopmentMode = require('../../../../lib/util/isDevelopmentMode');
var { validate } = require('graphql/validation');

module.exports = async function graphql(request, response, delegate, next) {
  const promises = [];
  Object.keys(delegate).forEach((id) => {
    // Check if middleware is async
    if (delegate[id] instanceof Promise) {
      promises.push(delegate[id]);
    }
  });
  try {
    const { body } = request;
    const { graphqlQuery, graphqlVariables, propsMap } = body;
    if (!graphqlQuery) {
      next();
    } else {
      // Try remove all white space and line break
      const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');
      if (query === 'queryQuery{}') {// TODO: oh no, so dirty. find a better way to check if the query is empty
        next();
      } else {
        const document = parse(graphqlQuery);

        // Validate the query
        const validationErrors = validate(schema, document);
        if (validationErrors.length > 0) {
          next(new Error(validationErrors[0].message));
        } else {
          if (isDevelopmentMode()) {
            schema = require('../../services/buildSchema');
          }
          const context = getContext(request);
          const data = await execute({
            schema, contextValue: getContext(request), document, variableValues: graphqlVariables
          });
          if (data.errors) {
            // Create an Error instance with message and stack trace
            console.log(data.errors)
            next(new Error(data.errors[0].message));
          } else {
            response.locals = response.locals || {};
            response.locals.graphqlResponse = JSON.parse(JSON.stringify(data.data));
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
}