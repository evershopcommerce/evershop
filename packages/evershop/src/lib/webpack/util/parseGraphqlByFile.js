const fs = require('fs');
const { parse } = require('graphql');
const uniqid = require('uniqid');
const { print } = require('graphql/language/printer');
const JSON5 = require('json5');

// This function should return an object { query, fragments, variables }.
module.exports.parseGraphqlByFile = function parseGraphqlByFile(module) {
  const result = {
    query: {},
    fragments: {},
    variables: {}
  };

  const variables = [];

  const fileSource = fs.readFileSync(module, 'utf8');
  /** Process query */
  // Regex matching export const query = `...` or export const query = "" or export const query = ''
  const queryRegex =
    /export\s+const\s+query\s*=\s*`([^`]+)`|export\s+const\s+query\s*=\s*["']([^"']+)["']/g;
  const queryMatch = fileSource.match(queryRegex);
  if (queryMatch) {
    let queryBody = queryMatch[0].replace(
      queryRegex,
      (match, p1, p2) => p1 || p2
    );
    queryBody = queryBody.replace(
      /getContextValue\(([^)]+)\)/g,
      (match, p1) => {
        const base64 = Buffer.from(p1).toString('base64');
        return `"getContextValue_${base64}"`;
      }
    );

    queryBody = queryBody.replace(
      /getWidgetSetting\(([^)]+)\)/g,
      (match, p1) => {
        const base64 = Buffer.from(p1).toString('base64');
        return `"getWidgetSetting_${base64}"`;
      }
    );

    const queryAst = parse(queryBody);
    const map = queryAst.definitions[0].selectionSet.selections.map(
      (selection) => {
        const name = selection.name.value;
        const alias = selection.alias ? selection.alias.value : name;
        const newAlias = `e${uniqid()}`;
        if (!selection.alias) {
          // eslint-disable-next-line no-param-reassign
          selection.alias = {
            kind: 'Name',
            value: newAlias
          };
        } else {
          // eslint-disable-next-line no-param-reassign
          selection.alias.value = newAlias;
        }

        return {
          origin: alias,
          alias: newAlias
        };
      }
    );

    // Get back the new query string
    queryBody = print(queryAst);

    // Regex to find all variable name and type ($name: Type!) in graphql query
    // eslint-disable-next-line no-useless-escape
    const variableRegex = /\$([a-zA-Z0-9]+)\s*:\s*([a-zA-Z0-9\[\]!]+)/g;
    const variableMatch = queryBody.match(variableRegex);
    if (variableMatch) {
      variableMatch.forEach((variable) => {
        // eslint-disable-next-line no-useless-escape
        const varRegex = /\$([a-zA-Z0-9]+)\s*:\s*([a-zA-Z0-9\[\]!]+)/;
        const varMatch = varRegex.exec(variable);
        const name = varMatch[1];
        const type = varMatch[2];
        variables.push({
          origin: name,
          type,
          alias: `variable_${uniqid()}`
        });
      });
    }

    // Relace all variable in graphql query
    variables.forEach((variable) => {
      const regex = new RegExp(`\\$${variable.origin}`, 'g');
      queryBody = queryBody.replace(regex, `$${variable.alias}`);
    });

    // Use slice function to get everything between the first '{' and the last '}' in the query
    queryBody = queryBody.slice(
      queryBody.indexOf('{') + 1,
      queryBody.lastIndexOf('}')
    );

    result.query.source = queryBody;
    result.query.props = map;
  } else {
    result.query.source = '';
    result.query.props = [];
  }

  /** Process fragments */
  // Regex matching export const query = `...` or export const query = "" or export const query = ''
  const fragmentsRegex =
    /export\s+const\s+fragments\s*=\s*`([^`]+)`|export\s+const\s+fragments\s*=\s*["']([^"']+)["']/g;
  const fragmentsMatch = fileSource.match(fragmentsRegex);
  const fragmentNames = [];
  if (fragmentsMatch) {
    const fragmentsBody = fragmentsMatch[0].replace(
      fragmentsRegex,
      (match, p1, p2) => p1 || p2
    );
    const fragmentsAst = parse(fragmentsBody);
    fragmentsAst.definitions.forEach((fragment) => {
      if (fragment.kind === 'FragmentDefinition') {
        fragmentNames.push({
          name: fragment.name.value,
          type: fragment.typeCondition.name.value
        });
      } else {
        throw new Error(
          `Only fragments are allowed in 'export const fragments = \`...\`. Error in ${module}`
        );
      }
    });
    result.fragments.source = fragmentsBody;
  } else {
    result.fragments.source = '';
  }

  // Using regex to get all fragment consumption (e.g. ...fragmentName)
  const fragmentConsumptions = (
    result.query.source.match(/\.\.\.([ ]+)?([a-zA-Z0-9_]+)/g) || []
  ).concat(
    result.fragments.source.match(/\.\.\.([ ]+)?([a-zA-Z0-9_]+)/g) || []
  );
  if (fragmentConsumptions.length > 0) {
    fragmentConsumptions.forEach((fragmentConsumption) => {
      const fragmentName = fragmentConsumption.replace(/\.\.\.([ ]+)?/, '');
      const fragment = fragmentNames.find((f) => f.name === fragmentName);
      if (!fragment) {
        throw new Error(
          `Fragment '${fragmentName}' is not defined in ${module}`
        );
      } else {
        result.fragments.pairs = result.fragments.pairs || [];
        const alias = `${fragmentName}_${uniqid()}`;
        const regex = new RegExp(`\\.\\.\\.([ ]+)?${fragmentName}`, 'g');
        // Replace in query source with alias
        result.query.source = result.query.source.replace(regex, `...${alias}`);
        // Replace in fragment source with alias
        result.fragments.source = result.fragments.source.replace(
          regex,
          `...${alias}`
        );
        result.fragments.pairs.push({
          name: fragmentName,
          alias,
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
  const variablesMatch = fileSource.match(variablesRegex);
  if (variablesMatch) {
    let variablesBody = variablesMatch[0].replace(
      variablesRegex,
      (match, p1) => p1
    );
    variablesBody = variablesBody.replace(
      /getContextValue\(([^)]+)\)/g,
      (match, p1) => {
        const base64 = Buffer.from(p1).toString('base64');
        return `"getContextValue_${base64}"`;
      }
    );
    variablesBody = variablesBody.replace(
      /getWidgetSetting\(([^)]*)\)/g,
      (match, p1) => {
        const base64 = Buffer.from(p1).toString('base64');
        return `"getWidgetSetting_${base64}"`;
      }
    );
    try {
      // Json parse the variables body
      const variablesJson = JSON5.parse(variablesBody);
      // Replace all variable in graphql query
      Object.keys(variablesJson).forEach((variableName) => {
        const variable = variables.find((v) => v.origin === variableName);
        if (variable) {
          variablesJson[variable.alias] = variablesJson[variableName];
          delete variablesJson[variableName];
        }
      });
      result.variables.source = JSON5.stringify(variablesJson);
      result.variables.definitions = variables;
    } catch (e) {
      throw new Error(`Invalid variables in ${module}`);
    }
  } else {
    result.variables.source = '{}';
    result.variables.definitions = [];
  }
  return result;
};
