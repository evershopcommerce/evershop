import { describe, it, expect } from '@jest/globals';
import { ESLint } from 'eslint';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * The stages in modules/import/services must not reach the outside world
 * (design principle 1 of the specification, 4.5). That is enforced by lint
 * rules in eslint.config.js; this test runs the repository's own configuration
 * on small pieces of code, so that a change to the configuration cannot switch
 * the rules off unnoticed.
 */
function repositoryRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(dir, 'eslint.config.js'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('eslint.config.js not found above the test');
    }
    dir = parent;
  }
  return dir;
}

const root = repositoryRoot();
const eslint = new ESLint({ cwd: root });
const servicesDir = 'packages/evershop/src/modules/import/services';

async function lint(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, {
    filePath: path.join(root, servicesDir, file)
  });
  return result.messages
    .filter((message) => message.ruleId !== 'import/order')
    .map((message) => `${message.ruleId}: ${message.message}`);
}

const problem = (rule: string, text: string) =>
  expect.stringMatching(new RegExp(`^${rule}: .*${text}`));

describe('lint rules for modules/import/services', () => {
  it('accept the plain code of a stage', async () => {
    const code = `
      import { Readable } from 'stream';
      import { createIssue } from '../issues.js';
      import type { ImportIssue } from '../types.js';
      import { helper } from './helper.js';
      export const clock = (now: () => number) => new Date(now());
      export const fixed = new Date(0);
      export const use = [Readable, createIssue, helper] as unknown as ImportIssue[];
    `;
    expect(await lint(code, 'reader/stage.ts')).toEqual([]);
  });

  it.each([
    ['fs', "import fs from 'fs';"],
    ['node:fs', "import { readFile } from 'node:fs/promises';"],
    ['pg', "import { Pool } from 'pg';"],
    ['http', "import http from 'node:http';"],
    ['crypto', "import { randomBytes } from 'crypto';"],
    ['undici', "import { fetch } from 'undici';"]
  ])('refuse the module %s', async (_name, code) => {
    expect(await lint(code, 'stage.ts')).toEqual([
      problem('no-restricted-imports', 'restricted')
    ]);
  });

  it('refuse the core, by package name and by relative path', async () => {
    const code = `
      import { select } from '@evershop/evershop/lib/postgres/query';
      import { pool } from '../../lib/postgres/connection.js';
      import { createProduct } from '../../catalog/services/index.js';
    `;
    expect(await lint(code, 'stage.ts')).toHaveLength(3);
  });

  it('refuse the layers above the stages: adapters, worker, test doubles, api', async () => {
    for (const layer of ['adapters', 'worker', 'testing', 'api']) {
      const code = `import { x } from '../${layer}/thing.js';`;
      expect((await lint(code, 'stage.ts')).length).toBeGreaterThan(0);
    }
  });

  it('refuse a way out of services/ from every folder depth, and allow a way up within it', async () => {
    expect(
      await lint("import { a } from '../issues.js';", 'stage.ts')
    ).toHaveLength(1);
    expect(
      await lint("import { a } from '../issues.js';", 'reader/stage.ts')
    ).toEqual([]);
    expect(
      await lint("import { a } from '../../x.js';", 'reader/stage.ts')
    ).toHaveLength(1);
    expect(
      await lint("import { a } from '../../issues.js';", 'a/b/stage.ts')
    ).toEqual([]);
    expect(
      await lint("import { a } from '../../../x.js';", 'a/b/stage.ts')
    ).toHaveLength(1);
    expect(
      await lint("import { a } from '../../../x.js';", 'a/b/c/d/e/f/stage.ts')
    ).toEqual([]);
    expect(
      await lint(
        "import { a } from '../../../../../../../x.js';",
        'a/b/c/d/e/f/stage.ts'
      )
    ).toHaveLength(1);
  });

  it('refuse the clock, random numbers, the environment, timers and fetch', async () => {
    const code = `
      export const a = Date.now();
      export const b = new Date();
      export const c = Math.random();
      export const d = process.env.NODE_ENV;
      export const e = fetch('https://example.com');
      export const f = setTimeout(() => undefined, 1);
      export const g = setInterval(() => undefined, 1);
      export const h = performance.now();
      export const i = crypto.randomUUID();
    `;
    const messages = await lint(code, 'stage.ts');
    expect(messages).toEqual(
      expect.arrayContaining([
        problem('no-restricted-properties', 'Date.now'),
        problem('no-restricted-syntax', 'new Date\\(\\)'),
        problem('no-restricted-properties', 'Math.random'),
        problem('no-restricted-properties', 'process.env'),
        problem('no-restricted-globals', 'fetch'),
        problem('no-restricted-globals', 'setTimeout'),
        problem('no-restricted-globals', 'setInterval'),
        problem('no-restricted-globals', 'performance'),
        problem('no-restricted-globals', 'crypto')
      ])
    );
  });

  it('do not apply outside services/ (the adapters may use all of it)', async () => {
    const [result] = await eslint.lintText(
      "import fs from 'fs'; export const a = [fs, Date.now(), process.env.X];",
      {
        filePath: path.join(
          root,
          'packages/evershop/src/modules/import/adapters/stage.ts'
        )
      }
    );
    expect(
      result.messages.filter((m) => m.ruleId?.startsWith('no-restricted'))
    ).toEqual([]);
  });
});
