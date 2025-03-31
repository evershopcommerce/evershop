import path from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeResolvers } from '@graphql-tools/merge';
import { CONSTANTS } from '@evershop/evershop/src/lib/helpers.js';
import { getEnabledExtensions } from '@evershop/evershop/bin/extension/index.js';

export function buildResolvers(isAdmin = false) {
  const typeSources = [
    path.join(CONSTANTS.MOLDULESPATH, '*/graphql/types/**/*.resolvers.js')
  ];

  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    typeSources.push(
      path.join(extension.path, 'graphql/types/**/*.resolvers.js')
    );
  });
  const resolvers = mergeResolvers(
    typeSources.map((source) =>
      loadFilesSync(source, {
        ignoredExtensions: isAdmin ? [] : ['.admin.resolvers.js']
      })
    )
  );

  return resolvers;
}
