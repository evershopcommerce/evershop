import fs from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { inspect } from 'util';
import { getComponentsByRoute } from '@evershop/evershop/src/lib/componee/getComponentsByRoute.js';
import { CONSTANTS } from '@evershop/evershop/src/lib/helpers.js';
import { getRouteBuildPath } from '@evershop/evershop/src/lib/webpack/getRouteBuildPath.js';
import { parseGraphql } from '@evershop/evershop/src/lib/webpack/util/parseGraphql.js';
import JSON5 from 'json5';
import { error } from '@evershop/evershop/src/lib/log/logger.js';
import { getEnabledWidgets } from '@evershop/evershop/src/lib/util/getEnabledWidgets.js';
import { generateComponentKey } from '@evershop/evershop/src/lib/webpack/util/keyGenerator.js';
/**
 * Only pass the page routes, not api routes
 */
export async function buildEntry(routes, clientOnly = false) {
  const widgets = getEnabledWidgets();
  await Promise.all(
    routes.map(async (route) => {
      const subPath = getRouteBuildPath(route);
      const components = getComponentsByRoute(route);
      if (!components) {
        return;
      }
      /** Build layout and query */
      const areas = {};
      components.forEach((module) => {
        if (!fs.existsSync(module)) {
          return;
        }
        const source = fs.readFileSync(module, 'utf8');
        // Regex matching 'export const layout = { ... }'
        const layoutRegex =
          /export\s+const\s+layout\s*=\s*{\s*areaId\s*:\s*['"]([^'"]+)['"],\s*sortOrder\s*:\s*(\d+)\s*,*\s*}/;
        const match = source.match(layoutRegex);
        if (match) {
          // Remove everything before '{' from the beginning of the match
          const check = match[0]
            .replace(/^[^{]*/, '')
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
          try {
            const layout = JSON5.parse(check);
            const id = generateComponentKey(
              module.replace(CONSTANTS.ROOTPATH, '')
            );
            areas[layout.areaId] = areas[layout.areaId] || {};
            areas[layout.areaId][id] = {
              id,
              sortOrder: layout.sortOrder,
              component: `---require('${module}')---`
            };
          } catch (e) {
            error(`Error parsing layout from ${module}`);
            error(e);
          }
        }
      });

      let contentClient = `
      import React from 'react';
      import ReactDOM from 'react-dom';
      import Area from '@evershop/evershop/src/components/common/Area';
      import Hydrate from '@evershop/evershop/src/components/common/react/client/${
        route.isAdmin ? 'HydrateAdmin' : 'HydrateFrontStore'
      }';
      `;
      areas['*'] = areas['*'] || {};
      widgets.forEach((widget) => {
        areas['*'][widget.type] = {
          id: widget.type,
          sortOrder: widget.sortOrder || 0,
          component: route.isAdmin
            ? `---require('${widget.setting_component}')---`
            : `---require('${widget.component}')---`
        };
      });
      contentClient += '\r\n';
      contentClient += `Area.defaultProps.components = ${inspect(areas, {
        depth: 5
      })
        .replace(/"---/g, '')
        .replace(/---"/g, '')} `;
      contentClient += '\r\n';
      contentClient += `ReactDOM.hydrate(
        <Hydrate/>,
        document.getElementById('app')
      );`;
      if (!fs.existsSync(path.resolve(subPath, 'client'))) {
        await mkdir(path.resolve(subPath, 'client'), { recursive: true });
      }
      await writeFile(
        path.resolve(subPath, 'client', 'entry.jsx'),
        contentClient
      );

      if (!clientOnly) {
        /** Build query */
        const query = `${JSON.stringify(parseGraphql(components))}`;

        // Loop through the widgets config and add the query to the widgets
        let contentServer = `import React from 'react'; `;
        contentServer += '\r\n';
        contentServer += `import ReactDOM from 'react-dom'; `;
        contentServer += '\r\n';
        contentServer += `import Area from '@evershop/evershop/src/components/common/Area';`;
        contentServer += '\r\n';
        contentServer += `Area.defaultProps.components = ${inspect(areas, {
          depth: 5
        })
          .replace(/"---/g, '')
          .replace(/---"/g, '')} `;

        if (!fs.existsSync(path.resolve(subPath, 'server'))) {
          await mkdir(path.resolve(subPath, 'server'), { recursive: true });
        }
        await writeFile(
          path.resolve(subPath, 'server', 'entry.jsx'),
          contentServer
        );
        await writeFile(
          path.resolve(subPath, 'server', 'query.graphql'),
          query
        );
      }
    })
  );
}
