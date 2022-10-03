const path = require('path');
const JSON5 = require('json5');
const isDevelopmentMode = require('../../../../lib/util/isDevelopmentMode');
const { getRouteBuildPath } = require('../../../../lib/webpack/getRouteBuildPath');
const { readFileSync } = require('fs');
const { CONSTANTS } = require('../../../../lib/helpers');
const { getRoutes } = require('../../../../lib/router/Router');
const { getContextValue } = require('../../services/contextHelper');

module.exports = (request, response) => {
  let query;
  if (isDevelopmentMode()) {
    // Get the 'query.graphql' from webpack compiler
    const { devMiddleware } = response.locals.webpack;
    const outputFileSystem = devMiddleware.outputFileSystem;
    const jsonWebpackStats = devMiddleware.stats.toJson();
    const { outputPath } = jsonWebpackStats;

    query = outputFileSystem.readFileSync(
      path.join(outputPath, 'query.graphql'),
      'utf8'
    );
  } else {
    const routes = getRoutes()
    const route = response.statusCode === 404 ? routes.find((route) => route.id === 'notFound') : request.currentRoute
    const subPath = getRouteBuildPath(route);
    query = readFileSync(
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'server/query.graphql'),
      'utf8'
    );
  }
  console.log('que', query)
  // Parse the query   
  // Use regex to replace "getContextValue_'base64 encoded string'" from the query to the actual function
  const regex = /\\\"getContextValue_([a-zA-Z0-9+/=]+)\\\"/g;
  query = query.replace(regex, (match, p1) => {
    const base64 = p1;
    const decoded = Buffer.from(base64, 'base64').toString('ascii');
    console.log(decoded);
    // const params = JSON5.parse(decoded);
    // console.log('params', params)
    let value = eval(`getContextValue(request, ${decoded})`);

    // JSON sringify without adding double quotes to the property name
    value = JSON5.stringify(value, { quote: '"' });
    // Escape the value so we can insert it into the query
    if (value) {
      value = value.replace(/"/g, '\\"')
    }
    return value;
  });
  console.log('---', query, '===');
  try {
    const json = JSON.parse(query);
    console.log(json)
    // Get all variables definition and build the operation name
    const variables = JSON.parse(json.variables);
    const operation = 'query Query';
    if (variables.defs.length > 0) {
      const variablesString = variables.defs.map((variable) => {
        return `$${variable.name}: ${variable.type}`;
      }).join(', ');
      operation += `(${variablesString})`;
    }
    request.body.graphqlQuery = `${operation} { ${json.query} } ${json.fragments}`;
    request.body.graphqlVariables = variables.values;
    request.body.propsMap = json.propsMap;
  } catch (error) {
    console.error(error);
    throw error;
  };
}
