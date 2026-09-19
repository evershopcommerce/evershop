import path from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';
import { widgetTypeDefs } from '../../../lib/widget/widgetManager.js';

export function buildTypeDefs(isAdmin = false) {
  const typeSources = [
    path.join(CONSTANTS.MODULESPATH, '*/graphql/types/**/*.graphql')
  ];

  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    typeSources.push(path.join(extension.path, 'graphql/types/**/*.graphql'));
  });
  const fileTypeDefs = typeSources.map((source) =>
    loadFilesSync(source, {
      ignoredExtensions: isAdmin ? [] : ['.admin.graphql']
    })
  );

  // Inject widget-emitted SDL last so the WidgetSettings union sees every
  // registered settingsType. Per Phase 2b — `widgetTypeDefs()` always emits a
  // `_UnregisteredWidgetSettings` sentinel so the union is non-empty even
  // when no widget has registered a graphql block.
  const typeDefs = mergeTypeDefs([...fileTypeDefs, widgetTypeDefs()]);

  return typeDefs;
}
