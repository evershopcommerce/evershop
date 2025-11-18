#!/usr/bin/env node
/* eslint-disable no-console */

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import boxen from 'boxen';
import enquirer from 'enquirer';
import kleur from 'kleur';
import ora from 'ora';

const { prompt } = enquirer;
async function selectTheme() {
  const themesDir = path.join(process.cwd(), 'themes');
  let themeNames: string[] = [];
  try {
    const files = await fs.readdir(themesDir, { withFileTypes: true });
    themeNames = files
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
    if (themeNames.length === 0) {
      console.error(kleur.red('No themes found in themes directory.'));
      process.exit(1);
    }
  } catch (err) {
    console.error(kleur.red('Error reading themes directory:'), err);
    process.exit(1);
  }
  const response: any = await prompt({
    type: 'select',
    name: 'theme',
    message: 'Select a theme to activate:',
    choices: themeNames
  });
  return response.theme;
}

async function updateConfig(theme: string) {
  const configDir = path.join(process.cwd(), 'config');
  const configPath = path.join(configDir, 'default.json');
  try {
    // Ensure config directory exists
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }

    // Read existing config or create new one
    let config: any = {};
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configData);
    } catch (err: any) {
      // If file doesn't exist, start with empty config
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    // Update theme
    config.system = config.system || {};
    config.system.theme = theme;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    console.log(
      boxen(kleur.green(`Theme updated to "${theme}" in config/default.json`), {
        padding: 1,
        borderColor: 'green'
      })
    );
  } catch (err) {
    console.error(kleur.red('Error updating config:'), err);
    process.exit(1);
  }
}

async function runBuild() {
  const spinner = ora('Running build...').start();
  return new Promise<void>((resolve, reject) => {
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        spinner.fail('Build failed');
        console.error(stderr);
        return reject(error);
      } else {
        spinner.succeed('Build completed successfully');
        console.log(stdout);
        return resolve();
      }
    });
  });
}

async function confirmBuild() {
  const response: any = await prompt({
    type: 'confirm',
    name: 'runBuild',
    initial: true,
    message: 'Would you like to run "npm run build" now?'
  });
  return response.runBuild;
}

async function activateTheme() {
  const theme = await selectTheme();
  await updateConfig(theme);
  const shouldBuild = await confirmBuild();
  if (shouldBuild) {
    await runBuild();
  } else {
    console.log(
      kleur.yellow('Remember to run "npm run build" later to apply changes.')
    );
  }
}

activateTheme().catch((err) => {
  console.error(kleur.red('An error occurred:'), err);
  process.exit(1);
});
