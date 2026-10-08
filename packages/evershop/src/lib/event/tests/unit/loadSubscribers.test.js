import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

const { loadSubscribers } = await import('../../loadSubscribers.js');

describe('loadSubscribers', () => {
  let modulePath;

  beforeAll(() => {
    modulePath = fs.mkdtempSync(path.join(os.tmpdir(), 'evershop-subs-'));
    // Without this, Node reads the `.js` files below as CommonJS.
    fs.writeFileSync(
      path.join(modulePath, 'package.json'),
      JSON.stringify({ type: 'module' })
    );
    const write = (folder, file, body) => {
      const dir = path.join(modulePath, 'subscribers', folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, file), body);
    };
    write('order_placed', 'named.js', 'export default () => "named";');
    write('_all', 'wildcard.js', 'export default () => "wildcard";');
    // Only compiled .js files are loaded.
    write('_all', 'ignored.txt', 'not a subscriber');
  });

  afterAll(() => {
    fs.rmSync(modulePath, { recursive: true, force: true });
  });

  it('registers a handler in a named folder under that event name', async () => {
    const subs = await loadSubscribers([{ path: modulePath }]);
    const named = subs.filter((s) => s.event === 'order_placed');
    expect(named).toHaveLength(1);
    expect(named[0].subscriber()).toBe('named');
  });

  it('registers a handler in the _all folder under the wildcard event', async () => {
    const subs = await loadSubscribers([{ path: modulePath }]);
    const wildcard = subs.filter((s) => s.event === '*');
    expect(wildcard).toHaveLength(1);
    expect(wildcard[0].subscriber()).toBe('wildcard');
  });

  it('never registers a subscriber under the literal folder name _all', async () => {
    const subs = await loadSubscribers([{ path: modulePath }]);
    expect(subs.some((s) => s.event === '_all')).toBe(false);
  });

  it('returns nothing for a module without a subscribers folder', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'evershop-empty-'));
    try {
      expect(await loadSubscribers([{ path: empty }])).toEqual([]);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });
});
