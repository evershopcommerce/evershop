import fs from 'fs';
import { pathToFileURL } from 'url';
import { inspect } from 'util';
import JSON5 from 'json5';
import { getEnabledWidgets } from '../../../lib/widget/widgetManager.js';
import { getAllRouteComponents } from '../../componee/getComponentsByRoute.js';
import { error } from '../../log/logger.js';
import { getRoutes } from '../../router/Router.js';
import { generateComponentKey } from '../util/keyGenerator.js';

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
  });
  return components;
};

export default function AreaLoader(c) {
  this.cacheable(false);
  const components = getAllRouteComponents();
  const routes = getRoutes();
  const allRootComponents = {};
  const widgets = getEnabledWidgets();
  const imports = new Map(); // This map has a key as an object {id, url} to avoid duplicate imports
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
  const content = `${Array.from(imports.values()).join(
    '\r\n'
  )}\r\nconst components = ${inspect(allRootComponents, { depth: 5 })
    .replace(/"---/g, '')
    .replace(/---"/g, '')
    .replace(/'---/g, '')
    .replace(
      /---'/g,
      ''
    )}\r\nArea.defaultProps.components = components[window.eContext.config.pageMeta.route.id] ;\r\n`;
  const result = c.replace('/** render */', content);
  return result;
}
