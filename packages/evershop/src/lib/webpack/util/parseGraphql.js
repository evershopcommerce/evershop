const fs = require('fs');
const uniqid = require('uniqid');
const JSON5 = require('json5');
const isResolvable = require('is-resolvable');
const { CONSTANTS } = require('../../helpers');
const { parseGraphqlByFile } = require('./parseGraphqlByFile');
const { generateComponentKey } = require('./keyGenerator');

module.exports.parseGraphql = function parseGraphql(modules) {
  let inUsedFragments = [];
  const propsMap = {};
  let queries = {};
  let fragmentStr = '';
  const variableList = {};
  modules.forEach((module) => {
    if (!fs.existsSync(module) && !isResolvable(module)) {
      return;
    }
    const variables = {
      values: {},
      defs: []
    };
    let modulePath;
    let moduleKey;
    // If the module is resolvable, get the apsolute path
    if (!fs.existsSync(module)) {
      modulePath = require.resolve(module);
      moduleKey = generateComponentKey(module);
    } else {
      modulePath = module;
      moduleKey = generateComponentKey(
        modulePath.replace(CONSTANTS.ROOTPATH, '')
      );
    }
    const moduleGraphqlData = parseGraphqlByFile(modulePath);
    queries[moduleKey] = moduleGraphqlData.query.source;
    fragmentStr += `\n${moduleGraphqlData.fragments.source}`;
    Object.assign(
      variables.values,
      JSON5.parse(moduleGraphqlData.variables.source)
    );
    variables.defs = variables.defs.concat(
      moduleGraphqlData.variables.definitions
    );
    variableList[moduleKey] = variables;
    propsMap[moduleKey] = moduleGraphqlData.query.props;
    inUsedFragments = inUsedFragments.concat(moduleGraphqlData.fragments.pairs);
  });

  // Process fragments
  const extraFragments = [];
  inUsedFragments.forEach((fragment) => {
    // Check if there was a fragment with same name and type already processed
    const f = extraFragments.find(
      (ar) => ar.name === fragment.name && ar.type === fragment.type
    );
    if (f) {
      // Replace fragment alias with the one already processed
      const regex = new RegExp(`\\.\\.\\.([ ]+)?${fragment.alias}`, 'g');
      queries = Object.keys(queries).reduce((acc, key) => {
        acc[key] = queries[key].replace(regex, `...${f.alias}`);
        return acc;
      }, {});
      fragmentStr = fragmentStr.replace(regex, `...${f.alias}`);
    } else {
      const regex = new RegExp(
        `fragment([ ]+)${fragment.name}([ ]+)on([ ]+)${fragment.type}`,
        'g'
      );
      fragmentStr = fragmentStr.replace(regex, () => {
        const alias = `${fragment.name}_${uniqid()}`;
        // Check if there is a fragment with the same name and type
        const frm = extraFragments.find(
          (ar) => ar.name === fragment.name && ar.type === fragment.type
        );
        if (frm) {
          frm.child.push(alias);
        } else {
          extraFragments.push({
            name: fragment.name,
            alias: fragment.alias,
            type: fragment.type,
            child: [alias]
          });
        }
        return `fragment ${alias} on ${fragment.type}`;
      });
    }
  });
  extraFragments.forEach((fragment) => {
    fragmentStr += `\nfragment ${fragment.alias} on ${
      fragment.type
    } {\n ${fragment.child.map((c) => `...${c}`).join('\n')} \n}`;
  });

  return {
    queries,
    fragments: fragmentStr,
    variables: variableList,
    propsMap
  };
};
