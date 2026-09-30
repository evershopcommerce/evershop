import { describe, expect, it } from '@jest/globals';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * Nothing reachable from a React component may import a Node builtin.
 *
 * These modules are bundled for the browser, where webpack cannot resolve
 * `path`, `fs` and friends. The failure is not a build error — it is a
 * `Cannot find module 'path'` thrown at load, which takes the whole admin
 * page down with it, and it appears the moment some shared utility gains an
 * innocuous-looking import.
 *
 * That is exactly how it happened: `lib/util/mime.ts` used
 * `path.posix.extname`, was server-only, and stayed harmless until the file
 * browser pulled it into the admin bundle through a new helper. The import is
 * hand-rolled now, and this walks the graph so the next one is caught here.
 */
const SRC = path.resolve(process.cwd(), 'packages/evershop/src');

const NODE_BUILTINS = new Set([
  'path',
  'fs',
  'os',
  'crypto',
  'http',
  'https',
  'stream',
  'zlib',
  'child_process',
  'net',
  'tls',
  'worker_threads',
  'perf_hooks',
  'readline'
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'tests') {
        walk(full, out);
      }
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(importer: string, spec: string): string | null {
  let candidate: string;
  if (spec.startsWith('@evershop/evershop/')) {
    candidate = path.join(SRC, spec.slice('@evershop/evershop/'.length));
  } else if (spec.startsWith('@components/')) {
    candidate = path.join(SRC, 'components', spec.slice('@components/'.length));
  } else if (spec.startsWith('.')) {
    candidate = path.resolve(path.dirname(importer), spec);
  } else {
    return null;
  }
  const tries = [
    candidate,
    candidate.replace(/\.js$/, '.ts'),
    candidate.replace(/\.js$/, '.tsx'),
    `${candidate}.ts`,
    `${candidate}.tsx`
  ];
  return tries.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

describe('client import graph', () => {
  it('imports no Node builtin from anything a component can reach', () => {
    const stack = walk(path.join(SRC, 'components'));
    const seen = new Set<string>();
    const violations: string[] = [];

    while (stack.length > 0) {
      const file = stack.pop() as string;
      if (seen.has(file) || !existsSync(file)) {
        continue;
      }
      seen.add(file);
      const source = readFileSync(file, 'utf8');
      const importRe =
        /import\s+(?:type\s+)?[^'"]*from\s+['"]([^'"]+)['"]/g;
      let match = importRe.exec(source);
      while (match !== null) {
        const spec = match[1];
        const bare = spec.split('/')[0].replace('node:', '');
        if (
          NODE_BUILTINS.has(bare) &&
          !spec.startsWith('.') &&
          !spec.startsWith('@')
        ) {
          violations.push(`${path.relative(SRC, file)} imports "${spec}"`);
        }
        const next = resolveImport(file, spec);
        if (next) {
          stack.push(next);
        }
        match = importRe.exec(source);
      }
    }

    // Proves the walk actually traversed rather than resolving nothing.
    expect(seen.size).toBeGreaterThan(100);
    expect([...new Set(violations)]).toEqual([]);
  });
});
