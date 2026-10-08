import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * An API route that reads `request.body` must have body-parsing middleware of
 * its own.
 *
 * EverShop does NOT parse request bodies globally — each route adds its own
 * (`[context]bodyParser[auth].js`, a raw parser for a webhook signature, or
 * multer for multipart). Forget it and `request.body` is simply `undefined`:
 * no crash, no warning, just a handler that sees no fields and reports
 * whatever its validation says about an empty value. The rename route shipped
 * that way and failed with "the new name is empty" for every rename.
 *
 * Checked by CONTENT, not filename: several routes name the middleware
 * `borderParser` — a typo that works, because a middleware file name sets the
 * ordering and nothing else.
 */
const MODULES = path.resolve(process.cwd(), 'packages/evershop/src/modules');

const PARSES_A_BODY =
  /bodyParser\.(json|urlencoded|raw|text)|express\.(json|urlencoded|raw|text)\(|multer\(\)?[\s\S]{0,80}\.(none|single|array|fields)\(|multerNone|getMulter\(\)/;

const READS_A_BODY = /\brequest\.body\b|\breq\.body\b/;

function routeDirs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) {
      continue;
    }
    if (entry === 'tests' || entry === 'node_modules') {
      continue;
    }
    const files = readdirSync(full);
    if (files.includes('route.json') && full.includes(`${path.sep}api${path.sep}`)) {
      out.push(full);
    }
    routeDirs(full, out);
  }
  return out;
}

describe('API routes that read a request body', () => {
  it('each declare body-parsing middleware', () => {
    const routes = routeDirs(MODULES);
    const offenders: string[] = [];

    for (const route of routes) {
      const sources = readdirSync(route).filter(
        (f) => f.endsWith('.js') || f.endsWith('.ts')
      );
      let readsBody = false;
      let parsesBody = false;
      for (const file of sources) {
        const source = readFileSync(path.join(route, file), 'utf8');
        if (READS_A_BODY.test(source)) {
          readsBody = true;
        }
        if (PARSES_A_BODY.test(source)) {
          parsesBody = true;
        }
      }
      if (readsBody && !parsesBody) {
        offenders.push(path.relative(MODULES, route));
      }
    }

    // Proves the walk found routes rather than resolving nothing.
    expect(routes.length).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
});
