import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from '@jest/globals';
import { parse } from 'graphql';

/**
 * Every `.graphql` file under `modules/` must parse on its own. The schema is
 * assembled at boot, so a syntax error (a `"""` description on an
 * `extend type`, which SDL forbids) only surfaced when the server started —
 * this makes `npm test` catch it. The walk runs over the compiled output,
 * where swc copies the `.graphql` files next to the resolvers.
 */
// dist/modules/graphql/tests/unit → dist/modules
const MODULES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.graphql')) out.push(full);
  }
  return out;
}

describe('GraphQL schema files', () => {
  const files = walk(MODULES);

  it('exist in the compiled output', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files.map((f) => [path.relative(MODULES, f), f]))('%s parses', (_label, file) => {
    expect(() => parse(fs.readFileSync(file, 'utf8'))).not.toThrow();
  });
});
