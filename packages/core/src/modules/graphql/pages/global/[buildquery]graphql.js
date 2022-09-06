const { executeGraphql } = require('../../services/createGraphQL');

module.exports = async function graphql(request, response, stack, next) {
  const { body } = request;
  const { graphqlQuery, variables, propsMap } = body;
  console.log(graphqlQuery);
  // Try remove all white space and line break
  const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');
  if (query === 'queryQuery{}') {// TODO: oh no, so dirty. find a better way to check if the query is empty
    next();
  }
  const data = await executeGraphql(graphqlQuery, variables);
  console.log(data);
  response.locals = response.locals || {};
  response.locals.graphqlResponse = data;
  // Get id and props from the queryRaw object and assign to response.locals.propsMap
  response.locals.propsMap = propsMap;
  next();
}