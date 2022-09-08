const schema = require('../../services/buildSchema');
const { context } = require('../../services/buildContext');
const { execute } = require('graphql');
const { parse } = require('graphql');

module.exports = async function graphql(request, response, stack, next) {
  const { body } = request;
  const { graphqlQuery, variables, propsMap } = body;
  console.log(graphqlQuery);
  // Try remove all white space and line break
  const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');
  if (query === 'queryQuery{}') {// TODO: oh no, so dirty. find a better way to check if the query is empty
    next();
  } else {
    const document = parse(graphqlQuery);
    const data = await execute({
      schema, contextValue: context, document, variables
    });
    if (data.errors) {
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