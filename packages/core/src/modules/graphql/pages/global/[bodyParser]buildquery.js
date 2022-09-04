const path = require('path');

module.exports = (request, response) => {
  // Get the 'query.graphql' from webpack compiler
  const { devMiddleware } = response.locals.webpack;
  const outputFileSystem = devMiddleware.outputFileSystem;
  const jsonWebpackStats = devMiddleware.stats.toJson();
  const { outputPath } = jsonWebpackStats;

  const query = outputFileSystem.readFileSync(
    path.join(outputPath, 'query.graphql'),
    'utf8'
  );
  console.log('que', query)
  // Attach the query to the request body
  try {
    const json = JSON.parse(query);
    request.body.graphqlQuery = `query Query { ${json.query} } ${json.fragments}`;
    request.body.propsMap = json.propsMap;
  } catch (error) {
    console.error(error);
    throw error;
  };
}
