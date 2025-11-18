import { PathLike } from 'fs';
import path from 'path';
import type { Event } from './watchHandler.js';
/**
 * Deduplicates a list of paths, keeping only the top-most created folders.
 * @param {Array<{ path: string, type: string }>} entries
 * @returns {Event[]} Top-level unique root folders
 */
export function getRootPaths(entries: Event[]): Event[] {
  const sortedPaths = entries
    .map((entry) => path.resolve(entry.path as string))
    .sort();

  const roots: Event[] = [];

  for (const current of sortedPaths) {
    if (!roots.some((root) => current.startsWith(root.path + path.sep))) {
      roots.push({
        path: current,
        type: entries.find((entry) => entry.path === current)?.type || 'create'
      });
    }
  }

  return roots;
}
