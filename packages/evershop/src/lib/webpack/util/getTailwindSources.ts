import path from 'path';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../helpers.js';
import { getEnabledTheme } from '../../util/getEnabledTheme.js';

export function getTailwindSources(): string[] {
  const sources: string[] = [];

  // Add the core source
  sources.push(
    path.resolve(CONSTANTS.MODULESPATH, '..', '**/*.{js,jsx,ts,tsx}')
  );

  // Add enabled extensions
  const extensions = getEnabledExtensions();
  for (const extension of extensions) {
    sources.push(path.resolve(extension.path, '**/*.{js,jsx,ts,tsx}'));
  }

  // Add enabled theme
  const theme = getEnabledTheme();
  if (theme) {
    sources.push(path.resolve(theme.path, '**/*.{js,jsx,ts,tsx}'));
  }

  return sources.map((s) => s.replace(/\\/g, '/'));
}
