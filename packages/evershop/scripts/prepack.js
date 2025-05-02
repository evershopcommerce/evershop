import fs from 'fs/promises';
import path from 'path';

/**
 * Recursively find all `index.js` files under `dist/`
 */
async function findIndexJsFiles(dir, root = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subResults = await findIndexJsFiles(fullPath, root);
      results.push(...subResults);
    } else if (entry.isFile() && entry.name === 'index.js') {
      const relativeDir = path.relative(root, path.dirname(fullPath));
      results.push(relativeDir);
    }
  }

  return results;
}

async function updatePackageExports() {
  const packageDir = path.resolve('../');
  const distDir = path.join(packageDir, 'evershop/dist');
  const indexDirs = await findIndexJsFiles(distDir);

  const exportsMap = {};

  for (const dir of indexDirs) {
    if (dir === '') continue; // already added root
    const exportKey = './' + dir;
    const exportPath = './dist/' + dir + '/index.js';
    exportsMap[exportKey] = exportPath;
  }

  const pkgJsonPath = path.join(packageDir, 'evershop/package.json');
  const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));

  pkg.exports = exportsMap;

  await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2));
  console.log('✅ Updated exports in packages/evershop/package.json');
}

updatePackageExports().catch(console.error);
