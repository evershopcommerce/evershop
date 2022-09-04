const fs = require('fs');
const uniqid = require('uniqid');
const { CONSTANTS } = require('../../helpers');
const { parseGraphqlByFile } = require('./parseGraphqlByFile');

module.exports.parseGraphql = function (modules) {
  let inUsedFragments = [];
  let propsMap = {};
  let queryStr = '';
  let fragmentStr = '';

  modules.forEach((module) => {
    if (!fs.existsSync(module)) {
      return;
    }

    const moduleKey = Buffer.from(module.replace(CONSTANTS.ROOTPATH, '')).toString('base64');
    const moduleGraphqlData = parseGraphqlByFile(module);
    queryStr += '\n' + moduleGraphqlData.query.source;
    fragmentStr += '\n' + moduleGraphqlData.fragments.source;
    propsMap[moduleKey] = moduleGraphqlData.query.props;
    inUsedFragments = inUsedFragments.concat(moduleGraphqlData.fragments.pairs);
  });

  // Process fragments
  const extraFragments = [];
  inUsedFragments.forEach((fragment) => {
    const regex = new RegExp(`fragment([ ]+)${fragment.name}([ ]+)on([ ]+)${fragment.type}`, 'g');
    fragmentStr = fragmentStr.replace(regex, (match, p1, p2, p3) => {
      const alias = `${fragment.name}_${uniqid()}`;
      // Check if there is a fragment with the same name and type
      const frm = extraFragments.find((f) => f.name === fragment.name && f.type === fragment.type);
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
    })
  });
  extraFragments.forEach((fragment) => {
    fragmentStr += `\nfragment ${fragment.alias} on ${fragment.type} {\n ${fragment.child.map((c) => `...${c}`).join('\n')} \n}`;
  });

  return {
    query: queryStr,
    fragments: fragmentStr,
    propsMap: propsMap
  }
}