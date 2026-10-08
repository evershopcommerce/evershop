import { describe, expect, it } from '@jest/globals';
import { normalizePage } from '../../../browFiles.js';
import { decodeCursor } from '../../cursor.js';

const file = (name: string) => ({ name, url: `/assets/${name}` });

describe('normalizePage — paging a provider that ignores options', () => {
  const opts = (over = {}) => ({ limit: 2, ...over });

  it('passes a native cursor through, wrapped for the provider', () => {
    const page = normalizePage(
      { files: [file('a')], folders: [], nextCursor: 'native-token' },
      opts(),
      's3'
    );
    expect(page.nextCursor).toBeDefined();
    expect(page.nextCursor).not.toBe('native-token');
    // Wrapped, so it cannot be replayed against another provider.
    expect(decodeCursor(page.nextCursor, 's3')).toEqual({
      kind: 'native',
      token: 'native-token'
    });
    expect(() => decodeCursor(page.nextCursor, 'azure')).toThrow();
  });

  it('leaves a short unpaged result alone — that is the end of the listing', () => {
    const page = normalizePage(
      { files: [file('a'), file('b')], folders: [] },
      opts(),
      'local'
    );
    expect(page.files.map((f) => f.name)).toEqual(['a', 'b']);
    expect(page.nextCursor).toBeUndefined();
  });

  it('slices in memory when a legacy provider returns everything', () => {
    // No cursor + more entries than asked for = the provider ignored options.
    const all = {
      files: [file('c'), file('a'), file('d'), file('b')],
      folders: []
    };
    const first = normalizePage(all, opts(), 'legacy');
    // Sorted: a legacy provider makes no ordering promise (readdir returns OS
    // order), so the service imposes the name order the contract advertises.
    expect(first.files.map((f) => f.name)).toEqual(['a', 'b']);
    expect(first.nextCursor).toBeDefined();

    const second = normalizePage(
      all,
      opts({ cursor: decodeCursor(first.nextCursor, 'legacy')!.token }),
      'legacy',
      decodeCursor(first.nextCursor, 'legacy')
    );
    expect(second.files.map((f) => f.name)).toEqual(['c', 'd']);
    expect(second.nextCursor).toBeUndefined();
  });

  it('never pages folders — the limit applies to files alone', () => {
    // Folders are navigation: a sidebar that fills in as you press "Load
    // more" cannot be navigated, because the folder you want may not have
    // arrived yet. They come complete with the first page; only files page.
    const page = normalizePage(
      { files: [file('b'), file('d'), file('e')], folders: ['a', 'c', 'z'] },
      opts({ limit: 2 }),
      'legacy'
    );
    expect(page.folders).toEqual(['a', 'c', 'z']);
    expect(page.files.map((f) => f.name)).toEqual(['b', 'd']);
    expect(page.nextCursor).toBeDefined();
  });

  it('seeks by name, so an upload between pages cannot skip an entry', () => {
    // A numeric offset would shift under the reader here: 'aa' lands before
    // the cursor and would push 'd' out of the second page entirely.
    const before = {
      files: [file('a'), file('b'), file('c'), file('d')],
      folders: []
    };
    const first = normalizePage(before, opts(), 'legacy');
    expect(first.files.map((f) => f.name)).toEqual(['a', 'b']);

    const after = { files: [...before.files, file('aa')], folders: [] };
    const second = normalizePage(
      after,
      opts({ cursor: decodeCursor(first.nextCursor, 'legacy')!.token }),
      'legacy',
      decodeCursor(first.nextCursor, 'legacy')
    );
    expect(second.files.map((f) => f.name)).toEqual(['c', 'd']);
  });

  it('applies the prefix search on behalf of a legacy provider', () => {
    const page = normalizePage(
      { files: [file('apple'), file('banana'), file('apricot')], folders: [] },
      opts({ limit: 10, prefix: 'ap' }),
      'legacy'
    );
    expect(page.files.map((f) => f.name)).toEqual(['apple', 'apricot']);
  });
});
