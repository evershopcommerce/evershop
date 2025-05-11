import path from 'path';
import url from 'url';
import { loadFiles } from '@graphql-tools/load-files';
import { mergeResolvers } from '@graphql-tools/merge';
import { CONSTANTS } from '../../../lib/helpers.js';
import { getEnabledExtensions } from '../../../bin/extension/index.js';

export async function buildResolvers(isAdmin = false) {
  const typeSources = [
    path.join(CONSTANTS.MOLDULESPATH, '*/graphql/types/**/*.resolvers.{js,ts}')
  ];

  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    typeSources.push(
      path.join(extension.path, 'graphql/types/**/*.resolvers.{js,ts}')
    );
  });

  // Using loadFiles with an array of glob patterns instead of joining them
  const resolvers = mergeResolvers(
    await loadFiles(typeSources, {
      ignoredExtensions: isAdmin
        ? []
        : ['.admin.resolvers.js', '.admin.resolvers.ts'],
      requireMethod: async (path) => {
        const module = await import(url.pathToFileURL(path));
        return module;
      }
    })
  );

  return resolvers;
}
