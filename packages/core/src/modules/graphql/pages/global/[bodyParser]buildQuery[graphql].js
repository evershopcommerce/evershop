const path = require('path');
const { context, getContextValue } = require('../../services/buildContext');

module.exports = (request, response) => {
  // Get the 'query.graphql' from webpack compiler
  const { devMiddleware } = response.locals.webpack;
  const outputFileSystem = devMiddleware.outputFileSystem;
  const jsonWebpackStats = devMiddleware.stats.toJson();
  const { outputPath } = jsonWebpackStats;

  let query = outputFileSystem.readFileSync(
    path.join(outputPath, 'query.graphql'),
    'utf8'
  );
  console.log('que', query)
  // Parse the query   

  // Use regex to replace "getContextValue_'base64 encoded string'" from the query to the actual function
  const regex = /\\\"getContextValue_([a-zA-Z0-9+/=]+)\\\"/g;
  query = query.replace(regex, (match, p1) => {
    const base64 = p1;
    const decoded = Buffer.from(base64, 'base64').toString('ascii');
    const params = JSON.parse(decoded);
    return getContextValue(params.key, params.defaultValue);
  });

  try {
    const json = JSON.parse(query);
    // Get all variables definition and build the operation name
    const variables = json.variables.defs;
    const operation = 'query Query';
    if (variables.length > 0) {
      const variablesString = variables.map((variable) => {
        return `$${variable.name}: ${variable.type}`;
      }).join(', ');
      operation += `(${variablesString})`;
    }
    request.body.graphqlQuery = `${operation} { ${json.query} } ${json.fragments}`;
    request.body.graphqlVariables = json.variables;
    request.body.propsMap = json.propsMap;
  } catch (error) {
    console.error(error);
    throw error;
  };
}
