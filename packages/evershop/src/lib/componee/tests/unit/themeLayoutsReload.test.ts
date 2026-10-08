import { mkdtempSync, rmSync, unlinkSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadThemeLayouts } from '../../themeLayouts.js';

// In dev the loader re-reads `layouts.json` on every recompile; the cache is
// keyed by the file's mtime so an edit is seen without a restart.
describe('loadThemeLayouts cache', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evershop-layouts-'));
  const file = join(dir, 'layouts.json');
  const at = (seconds: number) => utimesSync(file, seconds, seconds);
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('follows edits to the file by modification time', () => {
    writeFileSync(file, JSON.stringify({ 'all/Logo': { sortOrder: 1 } }));
    at(1_700_000_000);
    expect(loadThemeLayouts(file)).toEqual({ 'all/Logo': { sortOrder: 1 } });

    writeFileSync(file, JSON.stringify({ 'all/Logo': { areaId: 'headerBottom' } }));
    at(1_700_000_000); // same mtime: still the cached value
    expect(loadThemeLayouts(file)).toEqual({ 'all/Logo': { sortOrder: 1 } });

    at(1_700_000_001); // newer mtime: re-read
    expect(loadThemeLayouts(file)).toEqual({ 'all/Logo': { areaId: 'headerBottom' } });
  });

  it('forgets a deleted file and picks it up again when it reappears', () => {
    unlinkSync(file);
    expect(loadThemeLayouts(file)).toEqual({});
    writeFileSync(file, JSON.stringify({ 'all/SearchBox': { areaId: 'headerBottom', sortOrder: 5 } }));
    at(1_700_000_002);
    expect(loadThemeLayouts(file)).toEqual({ 'all/SearchBox': { areaId: 'headerBottom', sortOrder: 5 } });
  });
});
