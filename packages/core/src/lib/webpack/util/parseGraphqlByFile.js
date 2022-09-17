const fs = require('fs');
const { parse } = require('graphql');
const uniqid = require('uniqid');
const { print } = require("graphql/language/printer");

// This function should return an object { query, fragments, variables }.
module.exports.parseGraphqlByFile = function (module) {
  const result = {
    query: {},
    fragments: {},
    variables: {}
  };

  const variables = [];

  const fileSource = fs.readFileSync(module, 'utf8');
  /** Process query */
  // Regex matching export const query = `...` or export const query = "" or export const query = ''
  const queryRegex = /export\s+const\s+query\s*=\s*`([^`]+)`|export\s+const\s+query\s*=\s*["']([^"']+)["']/g;
  let queryMatch = fileSource.match(queryRegex);
  if (queryMatch) {
    let queryBody = queryMatch[0].replace(queryRegex, (match, p1, p2) => p1 || p2);
    // Replace 'getContextValue("key")' or getContextValue('key') or 'getContextValue("key", defaultValue)' or 'getContextValue('x', defaultValue)' to 'getContextValue_`base64 encoded of key and defaultValue`'`)' to avoid conflict with graphql-tag
    queryBody = queryBody.replace(/getContextValue\(([^)]+)\)/g, (match, p1) => {
      const args = p1.split(',').map((arg) => arg.trim());
      const key = args[0].replace(/['"]/g, '');
      const defaultValue = args[1] ? args[1].replace(/['"]/g, '') : undefined;
      const base64 = Buffer.from(JSON.stringify({ key, defaultValue })).toString('base64');
      return `"getContextValue_${base64}"`;
    });

    const queryAst = parse(queryBody);
    const map = queryAst.definitions[0].selectionSet.selections.map((selection) => {
      const name = selection.name.value;
      const alias = selection.alias ? selection.alias.value : name;
      const newAlias = `e${uniqid()}`;
      console.log(module, alias, newAlias);
      if (!selection.alias) {
        selection.alias = {
          kind: 'Name',
          value: newAlias
        }
      } else {
        selection.alias.value = newAlias;
      }

      return {
        origin: alias,
        alias: newAlias,
      };
    });

    // Get back the new query string
    queryBody = print(queryAst);

    // Regex to find all variable name and type ($name: Type!) in graphql query
    const variableRegex = /\$([a-zA-Z0-9]+)\s*:\s*([a-zA-Z0-9\[\]!]+)/g;
    let variableMatch = queryBody.match(variableRegex);
    if (variableMatch) {
      variableMatch.map((variable) => {
        const variableRegex = /\$([a-zA-Z0-9]+)\s*:\s*([a-zA-Z0-9\[\]!]+)/;
        const variableMatch = variableRegex.exec(variable);
        const name = variableMatch[1];
        const type = variableMatch[2];
        variables.push({
          origin: name,
          type,
          alias: `v${uniqid()}`,
        });
      });
    }

    // Relace all variable in graphql query
    variables.forEach((variable) => {
      const regex = new RegExp(`\\$${variable.origin}`, 'g');
      queryBody = queryBody.replace(regex, `$${variable.alias}`);
    });

    // Use slice function to get everything between the first '{' and the last '}' in the query
    queryBody = queryBody.slice(queryBody.indexOf('{') + 1, queryBody.lastIndexOf('}'));

    result.query.source = queryBody;
    result.query.props = map;
  } else {
    result.query.source = '';
    result.query.props = [];
  }

  //const variableRegex = /\$([a-zA-Z0-9]+\s*[:][])/g;

  // let variableMatch = queryBody.match(variableRegex);
  // if (variableMatch) {
  //   variableMatch.forEach((variable) => {
  //     const variableName = variable.replace(/[:\s]/g, '');
  //     variables.push({
  //       origin: variableName,
  //       alias: `v${uniqid()}`,
  //     });
  //   });
  // };

  /** Process fragments */
  // Regex matching export const query = `...` or export const query = "" or export const query = ''
  const fragmentsRegex = /export\s+const\s+fragments\s*=\s*`([^`]+)`|export\s+const\s+fragments\s*=\s*["']([^"']+)["']/g;
  let fragmentsMatch = fileSource.match(fragmentsRegex);
  const fragmentNames = [];
  if (fragmentsMatch) {
    let fragmentsBody = fragmentsMatch[0].replace(fragmentsRegex, (match, p1, p2) => p1 || p2);
    const fragmentsAst = parse(fragmentsBody);
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

  /** Processing variables */
  // Regex matching export const variables = `{ ... }`
  const variablesRegex = /export\s+const\s+variables\s*=\s*`([^`]+)`/g;
  let variablesMatch = fileSource.match(variablesRegex);
  if (variablesMatch) {
    let variablesBody = variablesMatch[0].replace(variablesRegex, (match, p1) => p1);
    // Replace 'getContextValue("key")' or getContextValue('key') or 'getContextValue("key", defaultValue)' or 'getContextValue('x', defaultValue)' to 'getContextValue_`base64 encoded of key and defaultValue`'`)' to avoid conflict with graphql-tag
    variablesBody = variablesBody.replace(/getContextValue\(([^)]+)\)/g, (match, p1) => {
      const args = p1.split(',').map((arg) => arg.trim());
      const key = args[0].replace(/['"]/g, '');
      const defaultValue = args[1] ? args[1].replace(/['"]/g, '') : undefined;
      const base64 = Buffer.from(JSON.stringify({ key, defaultValue })).toString('base64');
      return `"getContextValue_${base64}"`;
    });

    try {
      // Json parse the variables body
      const variablesJson = JSON.parse(variablesBody);
      // Replace all variable in graphql query
      Object.keys(variablesJson).forEach((variableName) => {
        const variable = variables.find((variable) => variable.origin === variableName);
        if (variable) {
          variablesJson[variable.alias] = variablesJson[variableName];
          delete variablesJson[variableName];
        }
      });
      result.variables.source = JSON.stringify(variablesJson);
      result.variables.definitions = variables;
    } catch (e) {
      console.log(e);
      throw new Error(`Invalid variables in ${module}`);
    }
  } else {
    result.variables.source = '{}';
    result.variables.definitions = [];
  }
  console.log(result);
  return result;
}


