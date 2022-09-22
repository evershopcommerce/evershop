const fs = require('fs');
const { inspect } = require('util');
const { CONSTANTS } = require('../../helpers');
const JSON5 = require('json5');

/* eslint-disable no-multi-assign */
/* eslint-disable global-require */
module.exports = exports = function areaLoader(c) {
  console.log(`----- Area loader`);
  const components = (this.getOptions().getComponents)();
  const routeId = this.getOptions().routeId;
  let content;
  let areas = {};
  components.forEach((module) => {
    this.addDependency(module);
    if (!fs.existsSync(module)) {
      return;
    }
    const source = fs.readFileSync(module, 'utf8');
    // Regex matching 'export const layout = { ... }'
    const layoutRegex = /export\s+const\s+layout\s*=\s*{\s*areaId\s*:\s*['"]([^'"]+)['"],\s*sortOrder\s*:\s*(\d+)\s*,*\s*}/;
    const match = source.match(layoutRegex);
    if (match) {
      // Remove everything before '{' from the beginning of the match
      const check = match[0].replace(/^[^{]*/, '').replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
      try {
        const layout = JSON5.parse(check);
        const id = Buffer.from(module.replace(CONSTANTS.ROOTPATH, '')).toString('base64');
        areas[layout.areaId] = areas[layout.areaId] || {};
        areas[layout.areaId][id] = {
          id: id,
          sortOrder: layout.sortOrder,
          component: `---require('${module}')---`,
        };
      } catch (e) {
        console.log(`Error parsing layout from ${module}`);
        console.log(e);
      }
    }
  });

  content = `Area.defaultProps.components = ${inspect(areas, { depth: 5 }).replace(/"---/g, '').replace(/---"/g, '')} `;
  return c.replace('/**render*/', content).replace('/eHot', `/eHot/${routeId}`);
};
