import fs from 'fs';
import { pathToFileURL } from 'url';
import { inspect } from 'util';
import JSON5 from 'json5';
import { getEnabledWidgets } from '../../../lib/widget/widgetManager.js';
import { getAllRouteComponents } from '../../componee/getComponentsByRoute.js';
import { error } from '../../log/logger.js';
import { getRoutes } from '../../router/Router.js';
import { generateComponentKey } from '../../util/keyGenerator.js';

function buildComponentsPerRoute(components, imports) {
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
        // Check if this import already exists by url
        // Get all key of current imports
        const keys = Array.from(imports.keys());
        const exists = keys.find((key) => key.url === url);
        if (!exists) {
          imports.set({ id, url }, `import ${id} from '${url}';`);
        }
        areas[layout.areaId] = areas[layout.areaId] || {};
        areas[layout.areaId][id] = {
          id,
          sortOrder: layout.sortOrder,
          component: {
            default: `---${id}---`
          }
        };
      } catch (e) {
        error(`Error parsing layout from ${module}`);
        error(e);
      }
    }
  });

  return areas;
}

const buildWidgetComponentsPerRoute = (route, widgets, imports) => {
  const components = {};
  widgets.forEach((widget) => {
    const componentPath = route.isAdmin
      ? widget.settingComponent
      : widget.component;
    const url = pathToFileURL(componentPath).toString();
    // Check if this import already exists by url
    // Get all key of current imports
    const keys = Array.from(imports.keys());
    const exists = keys.find((key) => key.url === url);
    const id = generateComponentKey(
      route.isAdmin ? `admin_widget_${widget.type}` : `widget_${widget.type}`
    );
    if (!exists) {
      imports.set({ id: id, url }, `import ${id} from '${url}';`);
    }
    components[id] = {
      id: id,
      sortOrder: widget.sortOrder || 0,
      component: {
        default: `---${id}---`
      }
    };

    // Admin bundles also ship each widget's previewComponent under a
    // separate wildcard-area key (`admin_widget_preview_<type>`). The
    // page-builder Widgets-palette hover card (`WidgetPreviewCard`) looks
    // it up via `getAreaComponents(routeId)['*']`. We
    // don't route this through `<Area>` because Area picks exactly one
    // component per widget type — and we need two for admin (settings +
    // preview).
    if (route.isAdmin && widget.previewComponent) {
      const previewUrl = pathToFileURL(widget.previewComponent).toString();
      const previewId = generateComponentKey(
        `admin_widget_preview_${widget.type}`
      );
      const previewExists = Array.from(imports.keys()).find(
        (key) => key.url === previewUrl
      );
      if (!previewExists) {
        imports.set(
          { id: previewId, url: previewUrl },
          `import ${previewId} from '${previewUrl}';`
        );
      }
      components[previewId] = {
        id: previewId,
        sortOrder: 0,
        component: {
          default: `---${previewId}---`
        }
      };
    }
  });
  return components;
};

export default function AreaLoader(c) {
  const isAdmin = this.getOptions().isAdmin;
  this.cacheable(false);
  const components = getAllRouteComponents(isAdmin);
  const routes = getRoutes().filter(
    (route) => route.isApi === false && route.isAdmin === isAdmin
  );
  const allRootComponents = {};
  const widgets = getEnabledWidgets();
  const imports = new Map(); // This map has a key as an object {id, url} to avoid duplicate imports

  try {
    Object.keys(components).forEach((routeId) => {
      allRootComponents[routeId] = buildComponentsPerRoute(
        components[routeId],
        imports
      );
      const route = routes.find((r) => r.id === routeId);
      const widgetComponents = buildWidgetComponentsPerRoute(
        route,
        widgets,
        imports
      );
      Object.assign(allRootComponents[routeId], { '*': widgetComponents });
    });
  } catch (e) {
    error('Error in AreaLoader:');
    error(e);
  }
  // Inject the `setAreaComponents` import here (at webpack time) rather than
  // relying on one in Index.jsx: that source import is unused in Index.jsx
  // itself (only the code injected below uses it), so swc elides it during the
  // src→dist compile and the injected call would hit `setAreaComponents is not
  // defined`. Injecting it post-swc, in the same module text webpack parses,
  // resolves the binding. Path must match Index.jsx's `@components/common/Area`
  // so it's the same module instance whose registry `<Area>` reads.
  const content = `import { setAreaComponents } from '@components/common/Area';\r\n${Array.from(
    imports.values()
  ).join('\r\n')}\r\nconst components = ${inspect(allRootComponents, { depth: 5 })
    .replace(/"---/g, '')
    .replace(/---"/g, '')
    .replace(/'---/g, '')
    .replace(
      /---'/g,
      ''
    )}\r\nObject.entries(components).forEach(([rid, map]) => setAreaComponents(rid, map));\r\n`;
  const result = c.replace('/** render */', content);
  return result;
}
