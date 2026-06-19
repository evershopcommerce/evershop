#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'fs/promises';
import path from 'path';
import boxen from 'boxen';
import enquirer from 'enquirer';
import kleur from 'kleur';
import { getConfig } from '../../lib/util/getConfig.js';

const { prompt } = enquirer;

function parseRelativeImports(content: string): string[] {
  const relativeImports: string[] = [];

  const importRegex =
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    // Check if it's a relative import (starts with ./ or ../)
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      relativeImports.push(importPath);
    }
  }

  return relativeImports;
}

function resolveImportPath(
  currentFilePath: string,
  importPath: string
): string {
  const currentDir = path.dirname(currentFilePath);
  const resolvedPath = path.resolve(currentDir, importPath);

  const extensions = ['.tsx', '.jsx', '.ts', '.js'];

  if (path.extname(resolvedPath)) {
    return resolvedPath;
  }

  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    try {
      return pathWithExt;
    } catch {
      continue;
    }
  }

  for (const ext of extensions) {
    const indexPath = path.join(resolvedPath, `index${ext}`);
    try {
      return indexPath;
    } catch {
      continue;
    }
  }

  return resolvedPath;
}

// Utility: Recursively find all dependencies of a file
async function findAllDependencies(
  filePath: string,
  visited: Set<string> = new Set(),
  baseDir: string
): Promise<string[]> {
  if (visited.has(filePath)) {
    return [];
  }

  visited.add(filePath);
  const dependencies: string[] = [];

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const relativeImports = parseRelativeImports(content);

    for (const importPath of relativeImports) {
      const resolvedPath = resolveImportPath(filePath, importPath);

      // Check if the resolved file exists and is within our base directory
      try {
        await fs.access(resolvedPath);

        // Only include files that are within our component structure
        if (resolvedPath.startsWith(baseDir)) {
          dependencies.push(resolvedPath);

          // Recursively find dependencies of this file
          const nestedDeps = await findAllDependencies(
            resolvedPath,
            visited,
            baseDir
          );
          dependencies.push(...nestedDeps);
        }
      } catch {
        // File doesn't exist, try other extensions
        const extensions = ['.tsx', '.jsx', '.ts', '.js'];
        let found = false;

        for (const ext of extensions) {
          const pathWithExt = resolvedPath + ext;
          try {
            await fs.access(pathWithExt);
            if (pathWithExt.startsWith(baseDir)) {
              dependencies.push(pathWithExt);
              const nestedDeps = await findAllDependencies(
                pathWithExt,
                visited,
                baseDir
              );
              dependencies.push(...nestedDeps);
              found = true;
              break;
            }
          } catch {
            continue;
          }
        }

        // Try index files if still not found
        if (!found) {
          for (const ext of extensions) {
            const indexPath = path.join(resolvedPath, `index${ext}`);
            try {
              await fs.access(indexPath);
              if (indexPath.startsWith(baseDir)) {
                dependencies.push(indexPath);
                const nestedDeps = await findAllDependencies(
                  indexPath,
                  visited,
                  baseDir
                );
                dependencies.push(...nestedDeps);
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }
    }
  } catch (err) {}

  return [...new Set(dependencies)];
}

async function scanDirectory(dir: string): Promise<string[]> {
  let results: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(await scanDirectory(fullPath));
      } else if (
        entry.isFile() &&
        (fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx'))
      ) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // ignore errors if directory doesn't exist
  }
  return results;
}

async function scanModulesFrontStore(): Promise<string[]> {
  const evershopDir = path.join(
    process.cwd(),
    'node_modules',
    '@evershop',
    'evershop'
  );

  const modulesDir = (await isRealDirectory(evershopDir))
    ? path.join(evershopDir, 'src', 'modules')
    : path.join(process.cwd(), 'packages', 'evershop', 'src', 'modules');
  let results: string[] = [];
  try {
    const modules = await fs.readdir(modulesDir, { withFileTypes: true });
    for (const mod of modules) {
      if (mod.isDirectory()) {
        const frontStoreDir = path.join(
          modulesDir,
          mod.name,
          'pages',
          'frontStore'
        );
        const files = await scanDirectory(frontStoreDir);
        results = results.concat(files);
      }
    }
  } catch (err) {}
  return results;
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

async function getOverrideCandidates(): Promise<string[]> {
  // Check if a folder @evershop/evershop exists in the node_modules
  const evershopDir = path.join(
    process.cwd(),
    'node_modules',
    '@evershop',
    'evershop'
  );
  let commonDir, frontStoreDir;
  if (await isRealDirectory(evershopDir)) {
    commonDir = path.join(evershopDir, 'src', 'components', 'common');
    frontStoreDir = path.join(evershopDir, 'src', 'components', 'frontStore');
  } else {
    commonDir = path.join(
      process.cwd(),
      'packages',
      'evershop',
      'src',
      'components',
      'common'
    );
    frontStoreDir = path.join(
      process.cwd(),
      'packages',
      'evershop',
      'src',
      'components',
      'frontStore'
    );
  }

  const files1 = await scanDirectory(commonDir);
  const files2 = await scanDirectory(frontStoreDir);
  const files3 = await scanModulesFrontStore();
  return [...files1, ...files2, ...files3];
}

function getCurrentTheme(): string {
  const theme = getConfig('system.theme');
  if (theme) {
    return theme;
  } else {
    console.error(
      kleur.red(
        'No theme set in config/system.theme. Please set a theme before creating overrides.'
      )
    );
    process.exit(1);
  }
}

// Given an original file path and current theme, determine the destination override file path
function getDestinationPath(originalPath: string, theme: string): string {
  const themeDir = path.join(process.cwd(), 'themes', theme, 'src');
  const componentsIdx = originalPath.indexOf(path.join('src', 'components'));
  const modulesIdx = originalPath.indexOf(path.join('src', 'modules'));

  if (componentsIdx !== -1) {
    // For files under src/components, replicate structure under <theme>/components
    const relativePath = originalPath.substring(
      originalPath.indexOf('components')
    );
    return path.join(themeDir, relativePath);
  } else if (modulesIdx !== -1) {
    // For files under src/modules/*/pages/frontStore/*, map to <theme>/pages/*
    const frontStoreMarker = path.join('pages', 'frontStore');
    const markerIdx = originalPath.indexOf(frontStoreMarker);
    if (markerIdx !== -1) {
      const relativePath = originalPath.substring(
        markerIdx + frontStoreMarker.length
      );
      // Ensure leading slash is removed
      const cleanedRelative = relativePath.replace(
        new RegExp(`^(\\${path.sep}|/)`),
        ''
      );
      return path.join(themeDir, 'pages', cleanedRelative);
    }
  }
  // Fallback: put in theme root
  return path.join(themeDir, path.basename(originalPath));
}

// Ensure directory exists
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Ignore if exists
  }
}

async function createOverrideFile() {
  const candidates = await getOverrideCandidates();
  if (candidates.length === 0) {
    console.error(kleur.red('No override candidates found.'));
    process.exit(1);
  }

  // Updated prompt: use 'autocomplete' and removed unsupported 'limit' property
  const relativeCandidates = candidates.map((filePath) =>
    path.relative(process.cwd(), filePath)
  );
  const response: any = await prompt({
    type: 'autocomplete',
    name: 'file',
    message: 'Select a file to override:',
    initial: 0,
    choices: relativeCandidates
  });
  const selectedRelative = response.file;
  const selectedFile = path.join(process.cwd(), selectedRelative);

  // Get current theme
  const theme = getCurrentTheme();

  // Determine the base directory for dependency tracking
  const evershopDir = path.join(
    process.cwd(),
    'node_modules',
    '@evershop',
    'evershop'
  );
  const baseDir = (await isRealDirectory(evershopDir))
    ? path.join(evershopDir, 'src')
    : path.join(process.cwd(), 'packages', 'evershop', 'src');

  // Find all dependencies of the selected file
  console.log(kleur.yellow('Analyzing dependencies...'));
  const dependencies = await findAllDependencies(
    selectedFile,
    new Set(),
    baseDir
  );
  const allFiles = [selectedFile, ...dependencies];

  console.log(kleur.cyan(`Found ${dependencies.length} dependencies:`));
  dependencies.forEach((dep) => {
    console.log(kleur.gray(`  ${path.relative(process.cwd(), dep)}`));
  });

  // Ask user if they want to copy dependencies
  if (dependencies.length > 0) {
    const confirmResponse: any = await prompt({
      type: 'confirm',
      name: 'copyDependencies',
      message: `Copy ${dependencies.length} dependency files along with the main file?`,
      initial: true
    });

    if (!confirmResponse.copyDependencies) {
      // Only copy the main file
      allFiles.splice(1); // Remove all dependencies, keep only the main file
    }
  }

  // Copy all files (main + dependencies if confirmed)
  const copiedFiles: string[] = [];

  for (const filePath of allFiles) {
    const destPath = getDestinationPath(filePath, theme);

    // Read content from file
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      console.error(kleur.red(`Error reading file ${filePath}:`), err);
      continue;
    }

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await ensureDir(destDir);

    // Write content to new file
    try {
      await fs.writeFile(destPath, content, 'utf8');
      copiedFiles.push(destPath);
    } catch (err) {
      console.error(kleur.red(`Error writing file ${destPath}:`), err);
    }
  }

  // Display results
  if (copiedFiles.length > 0) {
    console.log(
      boxen(
        kleur.green(
          `Successfully created ${copiedFiles.length} override file(s):\n`
        ) + copiedFiles.map((file) => kleur.white(`• ${file}`)).join('\n'),
        {
          padding: 1,
          borderColor: 'green'
        }
      )
    );
  } else {
    console.error(kleur.red('No files were copied.'));
    process.exit(1);
  }
}

createOverrideFile().catch((err) => {
  console.log(err);
  if (!err) {
    console.log(kleur.yellow('Command cancelled.'));
    process.exit(0);
  } else {
    console.error(kleur.red('An unexpected error occurred:'), err);
    process.exit(1);
  }
});
