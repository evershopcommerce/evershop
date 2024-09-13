const fs = require('fs');
const { inspect } = require('util');
const JSON5 = require('json5');
const { CONSTANTS } = require('../../helpers');
const { error } = require('../../log/logger');
const { getEnabledWidgets } = require('../../util/getEnabledWidgets');
const { generateComponentKey } = require('../util/keyGenerator');

/* eslint-disable no-multi-assign */
/* eslint-disable global-require */
module.exports = exports = function AreaLoader(c) {
  this.cacheable(false);
  const components = this.getOptions().getComponents();
  const { route } = this.getOptions();
  const areas = {};
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
        const id = generateComponentKey(module.replace(CONSTANTS.ROOTPATH, ''));
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
  const widgets = getEnabledWidgets();
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
  const content = `Area.defaultProps.components = ${inspect(areas, { depth: 5 })
    .replace(/"---/g, '')
    .replace(/---"/g, '')} `;
  return c
    .replace('/** render */', content)
    .replace('/eHot', `/eHot/${route.id}`);
};
