import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * Every component's `export const layout` must be readable by the build.
 *
 * The layout is not imported — it is extracted with a REGEX from the compiled
 * file text (`bin/lib/buildEntry.js`, `lib/webpack/loaders/AreaLoader.js`), and
 * the pattern allows only whitespace between `areaId` and `sortOrder`. Anything
 * else between the braces — a comment, most easily — makes the match fail, and
 * the component is dropped from the scan with no error, no warning and no
 * build failure. It simply never renders.
 *
 * That has cost real time twice: once on a theme's Logo, once on this menu
 * entry. Notes about a layout go ABOVE the export, never inside the object.
 */
const SRC = path.resolve(process.cwd(), 'packages/evershop/src');

// The exact pattern the build uses.
const LAYOUT_REGEX =
  /export\s+const\s+layout\s*=\s*\{\s*areaId\s*:\s*['"]([^'"]+)['"],\s*sortOrder\s*:\s*(\d+)\s*,*\s*\}/;
const DECLARES_LAYOUT = /export\s+const\s+layout\s*=/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'tests' && entry !== 'node_modules') {
        walk(full, out);
      }
    } else if (/\.(tsx|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('component layout declarations', () => {
  it('are all readable by the regex the build uses', () => {
    // Components only: the build tooling contains this same pattern as source
    // and would match itself.
    const files = [
      ...walk(path.join(SRC, 'components')),
      ...walk(path.join(SRC, 'modules'))
    ];

    const unreadable: string[] = [];
    let declaring = 0;

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (!DECLARES_LAYOUT.test(source)) {
        continue;
      }
      declaring += 1;
      if (!LAYOUT_REGEX.test(source)) {
        unreadable.push(path.relative(SRC, file));
      }
    }

    // Proves the walk found components rather than resolving nothing.
    expect(declaring).toBeGreaterThan(100);
    expect(unreadable).toEqual([]);
  });
});
