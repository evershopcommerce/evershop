import path from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';

export function buildTypeDefs(isAdmin = false) {
  const typeSources = [
    path.join(CONSTANTS.MODULESPATH, '*/graphql/types/**/*.graphql')
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
}
