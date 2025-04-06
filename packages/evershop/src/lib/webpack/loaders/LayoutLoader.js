export default function LayoutLoader(content) {
  // Regex matching 'export const layout = { ... }'
  const layoutRegex =
    /export\s+var\s+layout\s*=\s*{\s*areaId\s*:\s*['"]([^'"]+)['"],\s*sortOrder\s*:\s*(\d+)\s*,*\s*}/;

  return content.replace(layoutRegex, '');
}
