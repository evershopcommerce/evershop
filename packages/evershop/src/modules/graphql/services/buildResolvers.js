import path from 'path';
import url from 'url';
import { loadFiles } from '@graphql-tools/load-files';
import { mergeResolvers } from '@graphql-tools/merge';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';
import { isDevelopmentMode } from '../../../lib/util/isDevelopmentMode.js';

export async function buildResolvers(isAdmin = false) {
  const typeSources = [
    path.join(CONSTANTS.MODULESPATH, '*/graphql/types/**/*.resolvers.{js,ts}')
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
        ? ['.ts', '.d.ts']
        : ['.admin.resolvers.js', '.admin.resolvers.ts', '.ts', '.d.ts'],
      requireMethod: async (path) => {
        if (isDevelopmentMode()) {
          const module = await import(
            `${url.pathToFileURL(path)}?t=${Date.now()}`
          );
          return module;
        } else {
          const module = await import(url.pathToFileURL(path));
          return module;
        }
      }
    })
  );

  return resolvers;
}
