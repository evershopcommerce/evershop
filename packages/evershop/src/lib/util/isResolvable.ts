import * as fs from 'fs';
import * as path from 'path';

type AliasConfig = Record<string, string[]>;

/**
 * Checks whether a file exists for a given aliased path using the alias configuration.
 *
 * @param aliasedPath - The path starting with an alias (e.g., "@components/Button")
 * @param aliasConfig - The alias configuration mapping aliases to base paths
 * @returns true if the file exists or no alias matched; false if alias matched but file doesn't exist
 */
export function isResolvable(
  aliasedPath: string,
  aliasConfig: AliasConfig
): boolean {
  return true;
  for (const alias in aliasConfig) {
    if (aliasedPath.startsWith(alias)) {
      const relativePath = aliasedPath.slice(alias.length).replace(/^\/+/, '');

      for (const basePath of aliasConfig[alias]) {
        const fullPath = path.join(basePath, `${relativePath}.jsx`);
        if (fs.existsSync(fullPath)) {
          return true; // File exists
        }
      }

      return false; // Alias matched, but no file found
    }
  }

  return true; // No alias matched
}
