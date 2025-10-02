#!/usr/bin/env node
/* eslint-disable no-console */

import fs from 'fs/promises';
import path from 'path';
import boxen from 'boxen';
import enquirer from 'enquirer';
import kleur from 'kleur';
import { getConfig } from '../../lib/util/getConfig.js';

const { prompt } = enquirer;

// Utility: Recursively scan a directory and return files matching given extensions (.jsx, .tsx)
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

// Scan modules/*/pages/frontStore directory
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
  } catch (err) {
    // ignore modules directory errors
  }
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

// Read config/default.json to get the current theme from config.system.theme
function getCurrentTheme(): string {
  const theme = getConfig<string>('system.theme');
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
  const destPath = getDestinationPath(selectedFile, theme);

  // Read content from selected file
  let content: string;
  try {
    content = await fs.readFile(selectedFile, 'utf8');
  } catch (err) {
    console.error(kleur.red('Error reading selected file:'), err);
    process.exit(1);
  }

  // Ensure destination directory exists
  const destDir = path.dirname(destPath);
  await ensureDir(destDir);

  // Write content to new file
  try {
    await fs.writeFile(destPath, content, 'utf8');
    console.log(
      boxen(kleur.green(`Override file created at: ${destPath}`), {
        padding: 1,
        borderColor: 'green'
      })
    );
  } catch (err) {
    console.error(kleur.red('Error writing override file:'), err);
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
