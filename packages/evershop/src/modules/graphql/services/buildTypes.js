const path = require('path');
const { loadFilesSync } = require('@graphql-tools/load-files');
const { mergeTypeDefs } = require('@graphql-tools/merge');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { getEnabledExtensions } = require('../../../../bin/extension');

module.exports.buildTypeDefs = function buildTypeDefs(isAdmin = false) {
  const typeSources = [
    path.join(CONSTANTS.MOLDULESPATH, '*/graphql/types/**/*.graphql')
  ];

  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    typeSources.push(path.join(extension.path, 'graphql/types/**/*.graphql'));
  });
  const typeDefs = mergeTypeDefs(
    typeSources.map((source) =>
      loadFilesSync(source, {
        ignoredExtensions: isAdmin ? [] : ['.admin.graphql']
      })
    )
  );

  return typeDefs;
};
