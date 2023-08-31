const fs = require('fs');
const uniqid = require('uniqid');
const JSON5 = require('json5');
const { CONSTANTS } = require('../../helpers');
const { parseGraphqlByFile } = require('./parseGraphqlByFile');

module.exports.parseGraphql = function parseGraphql(modules) {
  let inUsedFragments = [];
  const propsMap = {};
  let queryStr = '';
  let fragmentStr = '';
  const variables = {
    values: {},
    defs: []
  };

  modules.forEach((module) => {
    if (!fs.existsSync(module)) {
      return;
    }

    const moduleKey = Buffer.from(
      module.replace(CONSTANTS.ROOTPATH, '')
    ).toString('base64');
    const moduleGraphqlData = parseGraphqlByFile(module);
    queryStr += `\n${moduleGraphqlData.query.source}`;
    fragmentStr += `\n${moduleGraphqlData.fragments.source}`;
    Object.assign(
      variables.values,
      JSON5.parse(moduleGraphqlData.variables.source)
    );
    variables.defs = variables.defs.concat(
      moduleGraphqlData.variables.definitions
    );
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
      queryStr = queryStr.replace(regex, `...${f.alias}`);
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
    query: queryStr,
    fragments: fragmentStr,
    variables: JSON5.stringify(variables),
    propsMap
  };
};
