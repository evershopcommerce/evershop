/* eslint-disable no-multi-assign */
/* eslint-disable global-require */
module.exports = exports = function layoutLoader(content) {
  console.log(`----- Layout loader`)
  // Regex matching 'export const layout = { ... }'
  const layoutRegex = /export\s+var\s+layout\s*=\s*{\s*areaId\s*:\s*['"]([^'"]+)['"],\s*sortOrder\s*:\s*(\d+)\s*}/;

  return content.replace(layoutRegex, '');
};
