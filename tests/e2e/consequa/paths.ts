import { existsSync } from 'node:fs';
import path from 'node:path';

/** The nearest directory holding `.git`, so file paths match the repository's. */
export function repositoryRoot(from: string): string {
  for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, '.git'))) return dir;
    if (path.dirname(dir) === dir) return path.resolve(from);
  }
}

/** Repository-relative, with forward slashes. */
export function relativeTo(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

/** Relative to the working directory when it is inside it, for messages. */
export function shortPath(file: string): string {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith('..') ? file : relative;
}

export function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
