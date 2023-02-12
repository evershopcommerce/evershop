/* eslint-disable no-multi-assign */
module.exports = exports = function GraphqlLoader(content) {
  // Regex matching 'export var query = `query { ... }`'
  const queryRegex = /export\s+var\s+query\s*=\s*`([^`]+)`/;

  const fragmentRegex = /export\s+var\s+fragment\s*=\s*`([^`]+)`/;

  const variablesRegex = /export\s+var\s+variables\s*=\s*`([^`]+)`/;

  return content
    .replace(queryRegex, '')
    .replace(fragmentRegex, '')
    .replace(variablesRegex, '');
};
