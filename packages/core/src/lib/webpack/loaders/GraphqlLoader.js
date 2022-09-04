/* eslint-disable global-require */
module.exports = exports = function GraphqlLoader(content) {
  console.log(`----- Graphql loader`)
  // Regex matching 'export var query = `query { ... }`'
  const queryRegex = /export\s+var\s+query\s*=\s*`([^`]+)`/;

  const fragmentRegex = /export\s+var\s+fragment\s*=\s*`([^`]+)`/;

  return content.replace(queryRegex, '').replace(fragmentRegex, '');
};
