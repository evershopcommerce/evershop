import fs from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { inspect } from 'util';
import JSON5 from 'json5';
import { getComponentsByRoute } from '../../lib/componee/getComponentsByRoute.js';
import { CONSTANTS } from '../../lib/helpers.js';
import { error } from '../../lib/log/logger.js';
import { generateComponentKey } from '../../lib/util/keyGenerator.js';
import { getRouteBuildPath } from '../../lib/webpack/getRouteBuildPath.js';
import { parseGraphql } from '../../lib/webpack/util/parseGraphql.js';
import { getEnabledWidgets } from '../../lib/widget/widgetManager.js';
/**
 * Only pass the page routes, not api routes
 */
export async function buildEntry(routes, clientOnly = false) {
  const widgets = getEnabledWidgets();
  const serverEntries = await Promise.all(
    routes.map(async (route) => {
      const imports = [];
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
            const id = generateComponentKey(module);
            const url = pathToFileURL(module).toString();
            imports.push(`import ${id} from '${url}';`);
            areas[layout.areaId] = areas[layout.areaId] || {};
            areas[layout.areaId][id] = {
              id,
              sortOrder: layout.sortOrder,
              component: { default: `---${id}---` }
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
      import { Area, setAreaComponents } from '@evershop/evershop/components/common';
      import {${
        route.isAdmin ? 'HydrateAdmin' : 'HydrateFrontStore'
      }} from '@evershop/evershop/components/common';
      `;
      areas['*'] = areas['*'] || {};
      widgets.forEach((widget) => {
        const url = route.isAdmin
          ? pathToFileURL(widget.settingComponent).toString()
          : pathToFileURL(widget.component).toString();
        const id = generateComponentKey(
          route.isAdmin
            ? `admin_widget_${widget.type}`
            : `widget_${widget.type}`
        );
        imports.push(`import ${id} from '${url}';`);
        areas['*'][id] = {
          id,
          sortOrder: widget.sortOrder || 0,
          component: {
            default: `---${id}---`
          }
        };

        // Admin bundles also ship each widget's previewComponent under a
        // separate wildcard-area key (`admin_widget_preview_<type>`). The
        // page-builder Widgets-palette hover card (`WidgetPreviewCard`) looks
        // it up via `getAreaComponents(routeId)['*']`. Mirror AreaLoader's
        // dev-mode behavior here so production builds also have the preview
        // registry.
        if (route.isAdmin && widget.previewComponent) {
          const previewUrl = pathToFileURL(widget.previewComponent).toString();
          const previewId = generateComponentKey(
            `admin_widget_preview_${widget.type}`
          );
          imports.push(`import ${previewId} from '${previewUrl}';`);
          areas['*'][previewId] = {
            id: previewId,
            sortOrder: 0,
            component: {
              default: `---${previewId}---`
            }
          };
        }
      });
      // Serialize the areas map to an object literal whose values reference the
      // imported component bindings (the `---id---` markers become bare ids).
      const areasLiteral = inspect(areas, { depth: 5 })
        .replace(/"---/g, '')
        .replace(/---"/g, '')
        .replace(/'---/g, '')
        .replace(/---'/g, '');
      contentClient += '\r\n';
      contentClient += imports.join('\r\n');
      contentClient += '\r\n';
      contentClient += `setAreaComponents('${route.id}', ${areasLiteral});`;
      contentClient += '\r\n';
      contentClient += `ReactDOM.hydrate(
        ${
          route.isAdmin
            ? 'React.createElement(HydrateAdmin, null)'
            : 'React.createElement(HydrateFrontStore, null)'
        },
        document.getElementById('app')
      );`;
      if (!fs.existsSync(path.resolve(subPath, 'client'))) {
        await mkdir(path.resolve(subPath, 'client'), { recursive: true });
      }
      await writeFile(
        path.resolve(subPath, 'client', 'entry.js'),
        contentClient
      );

      if (!clientOnly) {
        /** Per-route merged GraphQL query — consumed at runtime by the
         * buildQuery middleware, independent of the server bundle. */
        const query = `${JSON.stringify(parseGraphql(components))}`;
        if (!fs.existsSync(path.resolve(subPath, 'server'))) {
          await mkdir(path.resolve(subPath, 'server'), { recursive: true });
        }
        await writeFile(
          path.resolve(subPath, 'server', 'query.graphql'),
          query
        );
        // Phase 2: collect this route's component imports + registration so the
        // per-context server bundle (written after the loop) imports every
        // component once and registers every route's component map.
        return {
          context: route.isAdmin ? 'admin' : 'frontStore',
          imports,
          registration: `setAreaComponents('${route.id}', ${areasLiteral});`
        };
      }
      return null;
    })
  );

  if (clientOnly) {
    return;
  }

  // Phase 2: write ONE server (SSR) entry per context. Each imports every one of
  // its routes' components (deduped — webpack builds the shared module graph
  // once) and registers each route's map; `renderHtml` + `Area` select the
  // current route at render time. Replaces the old per-route server entries and
  // their per-bundle vendor duplication.
  const byContext = {};
  for (const entry of serverEntries) {
    if (!entry) {
      continue;
    }
    const bucket = (byContext[entry.context] = byContext[entry.context] || {
      imports: new Map(),
      registrations: []
    });
    entry.imports.forEach((imp) => bucket.imports.set(imp, true));
    bucket.registrations.push(entry.registration);
  }
  await Promise.all(
    Object.entries(byContext).map(async ([context, bucket]) => {
      let contentServer = `import React from 'react';\r\n`;
      contentServer += `import ReactDOM from 'react-dom';\r\n`;
      contentServer += `import { Area, setAreaComponents } from '@evershop/evershop/components/common';\r\n`;
      contentServer += `import { renderHtml } from '@evershop/evershop/components/common';\r\n`;
      contentServer += [...bucket.imports.keys()].join('\r\n');
      contentServer += '\r\n';
      contentServer += `export default renderHtml;\r\n`;
      contentServer += bucket.registrations.join('\r\n');
      contentServer += '\r\n';
      const serverDir = path.resolve(CONSTANTS.BUILDPATH, context, 'server');
      await mkdir(serverDir, { recursive: true });
      await writeFile(path.resolve(serverDir, 'entry.js'), contentServer);
    })
  );
}
