import fs from 'fs';
import { pathToFileURL } from 'url';
import { inspect } from 'util';
import JSON5 from 'json5';
import { getEnabledWidgets } from '../../../lib/widget/widgetManager.js';
import { error } from '../../log/logger.js';
import { generateComponentKey } from '../util/keyGenerator.js';

export default function AreaLoader(c) {
  this.cacheable(false);
  const components = this.getOptions().getComponents();
  const { route } = this.getOptions();
  const areas = {};
  const imports = [];
  components.forEach((module) => {
    this.addDependency(module);
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
  const widgets = getEnabledWidgets();
  areas['*'] = areas['*'] || {};
  widgets.forEach((widget) => {
    const url = pathToFileURL(
      route.isAdmin ? widget.settingComponent : widget.component
    ).toString();
    imports.push(`import ${widget.type} from '${url}';`);
    areas['*'][widget.type] = {
      id: widget.type,
      sortOrder: widget.sortOrder || 0,
      component: {
        default: `---${widget.type}---`
      }
    };
  });
  const content = `${imports.join(
    '\r\n'
  )}\r\nArea.defaultProps.components = ${inspect(areas, { depth: 5 })
    .replace(/"---/g, '')
    .replace(/---"/g, '')
    .replace(/'---/g, '')
    .replace(/---'/g, '')} ;`;
  const result = c
    .replace('/** render */', content)
    .replace('/eHot', `/eHot/${route.id}`);
  return result;
}
