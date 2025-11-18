#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'fs/promises';
import path from 'path';
import enquirer from 'enquirer';
import kleur from 'kleur';

const { prompt } = enquirer;
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function isRealDirectory(path) {
  try {
    const stats = await fs.lstat(path);
    if (stats.isSymbolicLink()) {
      return false;
    }
    return stats.isDirectory();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

async function createTheme() {
  const response: any = await prompt({
    type: 'input',
    name: 'name',
    message: 'Enter new theme name (alphanumeric, dashes or underscores only):'
  });
  const name: string = response.name.trim();

  // Validate name
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    console.error(
      kleur.red(
        'Invalid theme name. Use only letters, numbers, dashes or underscores.'
      )
    );
    process.exit(1);
  }

  const themeDir = path.join(process.cwd(), 'themes', name);
  const pagesDir = path.join(themeDir, 'src', 'pages', 'homepage');
  const componentFile = path.join(pagesDir, `${capitalize(name)}.tsx`);

  // Prevent overwriting existing themes
  try {
    await fs.access(themeDir);
    console.error(kleur.red(`Theme '${name}' already exists.`));
    process.exit(1);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error(kleur.red('Error checking theme existence:'), err);
      process.exit(1);
    }
    // Directory does not exist, proceed
  }

  try {
    // Create directories
    await fs.mkdir(pagesDir, { recursive: true });

    // Create package.json for the new theme
    const packageJsonPath = path.join(themeDir, 'package.json');
    const packageJsonContent = {
      name,
      version: '0.1.0',
      type: 'module',
      private: true,
      scripts: {
        build: 'tsc'
      }
    };
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJsonContent, null, 2),
      'utf8'
    );

    // Create tsconfig.json for the new theme
    const tsconfigPath = path.join(themeDir, 'tsconfig.json');
    const tsconfigContent = {
      compilerOptions: {
        module: 'NodeNext',
        target: 'ES2018',
        lib: ['dom', 'dom.iterable', 'esnext'],
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        declaration: true,
        sourceMap: true,
        allowJs: true,
        checkJs: false,
        jsx: 'react',
        outDir: './dist',
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        allowArbitraryExtensions: true,
        strictNullChecks: true,
        baseUrl: '.',
        rootDir: 'src',
        paths: {
          '@components/*': (await isRealDirectory(
            path.join(process.cwd(), 'node_modules', '@evershop', 'evershop')
          ))
            ? [
                './src/components/*',
                '../../node_modules/@evershop/evershop/src/components/*'
              ]
            : ['./src/components/*', '../../packages/evershop/src/components/*']
        }
      },
      include: ['src']
    };
    await fs.writeFile(
      tsconfigPath,
      JSON.stringify(tsconfigContent, null, 2),
      'utf8'
    );

    // Create component file
    const componentContent = `import React from 'react';

const ${capitalize(name)}: React.FC = () => {
  return (
    <div className="p-5 text-center text-2xl border border-dashed border-gray-300 my-5 mx-2 bg-blue-50 text-blue-800">
      <h3 className="mb-3">
        Welcome to the <span className="text-pink-500">&#9829; </span>
        ${name} <span className="text-pink-500">&#9829; </span> theme!
      </h3>
      <code className="text-sm break-all">
        You can edit this file at:
        ${componentFile}
      </code>
    </div>
  );
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export default ${capitalize(name)};
`;
    await fs.writeFile(componentFile, componentContent, 'utf8');

    console.log(kleur.green(`Theme '${name}' created.`));
    console.log(kleur.blue(`Edit your new page at: ${componentFile}`));
  } catch (err: any) {
    console.error(kleur.red('Error creating theme:'), err);
    process.exit(1);
  }
}

createTheme().catch((err: any) => {
  if (err) {
    console.error(kleur.red('An unexpected error occurred:'), err);
  }
  process.exit(1);
});
