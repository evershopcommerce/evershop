const fs = require('fs');
const graphqlTag = require('graphql-tag');
const uniqid = require('uniqid');
const { getContextValue } = require('../../../modules/graphql/services/buildContext');

// This function should return an object { query, fragments, variables }.
module.exports.parseGraphqlByFile = function (module) {
  const result = {
    query: {},
    fragments: {},
    variables: {}
  };
  const fileSource = fs.readFileSync(module, 'utf8');
  /** Process query */
  // Regex matching export const query = `...` or export const query = "" or export const query = ''
  const queryRegex = /export\s+const\s+query\s*=\s*`([^`]+)`|export\s+const\s+query\s*=\s*["']([^"']+)["']/g;
  let queryMatch = fileSource.match(queryRegex);
  if (queryMatch) {
    let queryBody = queryMatch[0].replace(queryRegex, (match, p1, p2) => p1 || p2);
    // Replace 'getContextValue("key")' or getContextValue('key') or 'getContextValue("key", defaultValue)' or 'getContextValue('x', defaultValue)' with actual function return value
    queryBody = queryBody.replace(/getContextValue\(([^)]+)\)/g, (match, p1) => {
      const args = p1.split(',').map((arg) => arg.trim());
      const key = args[0].replace(/['"]/g, '');
      const defaultValue = args[1] ? args[1].replace(/['"]/g, '') : undefined;
      return JSON.stringify(getContextValue(key, defaultValue));
    });

    const queryAst = graphqlTag(queryBody);
    const keys = queryAst.definitions[0].selectionSet.selections.map((selection) => {
      return selection.name.value;
    });

    // Use slice function to get everything between the first '{' and the last '}' in the query
    queryBody = queryBody.slice(queryBody.indexOf('{') + 1, queryBody.lastIndexOf('}'));

    result.query = {
      source: queryBody,
      props: keys
    };
  } else {
    result.query = {
      source: '',
      props: []
    };
  }
  /** Process fragments */
  // Regex matching export const query = `...` or export const query = "" or export const query = ''
  const fragmentsRegex = /export\s+const\s+fragments\s*=\s*`([^`]+)`|export\s+const\s+fragments\s*=\s*["']([^"']+)["']/g;
  let fragmentsMatch = fileSource.match(fragmentsRegex);
  const fragmentNames = [];
  if (fragmentsMatch) {
    let fragmentsBody = fragmentsMatch[0].replace(fragmentsRegex, (match, p1, p2) => p1 || p2);
    const fragmentsAst = graphqlTag(fragmentsBody);
    fragmentsAst.definitions.forEach((fragment) => {
      if (fragment.kind === 'FragmentDefinition') {
        fragmentNames.push({
          name: fragment.name.value,
          type: fragment.typeCondition.name.value
        });
      } else {
        throw new Error(`Only fragments are allowed in 'export const fragments = \`...\`. Error in ${module}`);
      }
    });
    result.fragments.source = fragmentsBody;
  } else {
    result.fragments.source = '';
  }

  // Using regex to get all fragment consumption (e.g. ...fragmentName)
  const fragmentConsumptions = (result.query.source.match(/\.\.\.([ ]+)?([a-zA-Z0-9_]+)/g) || []).concat((result.fragments.source.match(/\.\.\.([ ]+)?([a-zA-Z0-9_]+)/g) || []));
  if (fragmentConsumptions.length > 0) {
    fragmentConsumptions.forEach((fragmentConsumption) => {
      const fragmentName = fragmentConsumption.replace(/\.\.\.([ ]+)?/, '');
      const fragment = fragmentNames.find((fragment) => fragment.name === fragmentName);
      if (!fragment) {
        throw new Error(`Fragment '${fragmentName}' is not defined in ${module}`);
      } else {
        result.fragments.pairs = result.fragments.pairs || [];
        const alias = `${fragmentName}_${uniqid()}`;
        const regex = new RegExp(`\\.\\.\\.([ ]+)?${fragmentName}`, 'g');
        // Replace in query source with alias
        result.query.source = result.query.source.replace(regex, `...${alias}`);
        // Replace in fragment source with alias
        result.fragments.source = result.fragments.source.replace(regex, `...${alias}`);
        result.fragments.pairs.push({
          name: fragmentName,
          alias: alias,
          type: fragment.type
        });
      }
    });
  } else {
    result.fragments.pairs = [];
  }
  console.log(result);
  return result;
}

