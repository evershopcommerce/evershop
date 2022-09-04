const axios = require('axios');

module.exports = async function graphql(request, response) {
  const { body } = request;
  const { graphqlQuery, variables, propsMap } = body;
  console.log(graphqlQuery);
  // Try remove all white space and line break
  const query = graphqlQuery.replace(/(\r\n|\n|\r|\s)/gm, '');
  if (query === 'queryQuery{}') {// TODO: oh no, so dirty. find a better way to check if the query is empty
    return;
  }
  const { data } = await axios.post('https://swapi-graphql.netlify.app/.netlify/functions/index', {
    operationName: 'Query',
    query: graphqlQuery,
    variables: variables,
  });
  response.locals = response.locals || {};
  response.locals.graphqlResponse = data.data;
  // Get id and props from the queryRaw object and assign to response.locals.propsMap
  response.locals.propsMap = propsMap;
}