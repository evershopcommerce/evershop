import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';

/**
 * The address library is pure and isomorphic (spec § 3.11): nothing under
 * lib/address may import the database, Express, the filesystem, node-config,
 * any module, the value registry or the logger — and nothing may reach outside
 * the folder at all. Server concerns are injected through
 * `configureAddressRuntime`. This test walks the COMPILED output, so it also
 * catches what a type-only import would hide.
 */

// dist/lib/address/tests/unit → dist/lib/address
const LIB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const FORBIDDEN_BARE = [
  /^pg$/,
  /^express(\/|$)/,
  /^(node:)?fs(\/|$)/,
  /^(node:)?child_process(\/|$)/,
  /^config$/,
  /^@evershop\/postgres-query-builder/,
  /^winston$/
];

const FORBIDDEN_PATH_FRAGMENTS = [
  '/modules/',
  '/lib/postgres',
  '/lib/util/registry',
  '/lib/log',
  '/lib/util/getConfig'
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function specifiersOf(source: string): string[] {
  const found: string[] = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /^\s*import\s+['"]([^'"]+)['"]/gm
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) found.push(m[1]);
  }
  return found;
}

describe('lib/address purity', () => {
  const files = walk(LIB_ROOT);

  it('has compiled output to inspect', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('imports nothing outside lib/address and none of the forbidden server modules', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const spec of specifiersOf(source)) {
        const rel = path.relative(LIB_ROOT, file);
        if (spec.startsWith('.')) {
          const resolved = path.resolve(path.dirname(file), spec);
          if (!resolved.startsWith(LIB_ROOT + path.sep) && resolved !== LIB_ROOT) {
            offenders.push(`${rel} → ${spec} (leaves lib/address)`);
          } else if (FORBIDDEN_PATH_FRAGMENTS.some((f) => resolved.includes(f))) {
            offenders.push(`${rel} → ${spec}`);
          }
        } else if (FORBIDDEN_BARE.some((re) => re.test(spec))) {
          offenders.push(`${rel} → ${spec}`);
        } else if (FORBIDDEN_PATH_FRAGMENTS.some((f) => spec.includes(f))) {
          offenders.push(`${rel} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
