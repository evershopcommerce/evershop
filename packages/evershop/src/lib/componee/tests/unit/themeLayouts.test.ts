import { describe, expect, it } from '@jest/globals';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  applyThemeLayout,
  layoutKeyOf,
  loadThemeLayouts,
  parseThemeLayouts
} from '../../themeLayouts.js';

const base = { areaId: 'headerMiddleCenter', sortOrder: 10 };

describe('layoutKeyOf', () => {
  it('is <routeFolder>/<Name> without the extension, from any tree', () => {
    expect(layoutKeyOf('/x/modules/base/pages/frontStore/all/Logo.js')).toBe('all/Logo');
    expect(layoutKeyOf('/x/themes/atelier/dist/pages/all/Logo.js')).toBe('all/Logo');
    expect(layoutKeyOf('/x/extensions/foo/dist/pages/frontStore/productView/Badge.js')).toBe('productView/Badge');
    expect(layoutKeyOf('C:\\x\\pages\\frontStore\\productEdit+productNew\\Title.js')).toBe('productEdit+productNew/Title');
  });
  it('returns null for a bare file name', () => {
    expect(layoutKeyOf('Logo.js')).toBeNull();
  });
});

describe('applyThemeLayout', () => {
  it('moves a component to another area and order', () => {
    const map = { 'all/Logo': { areaId: 'headerMiddleLeft', sortOrder: 5 } };
    expect(applyThemeLayout('/x/pages/frontStore/all/Logo.js', base, map)).toEqual({ areaId: 'headerMiddleLeft', sortOrder: 5 });
  });
  it('is partial: only the given field changes', () => {
    expect(applyThemeLayout('/x/all/Logo.js', base, { 'all/Logo': { sortOrder: 1 } })).toEqual({ areaId: 'headerMiddleCenter', sortOrder: 1 });
    expect(applyThemeLayout('/x/all/Logo.js', base, { 'all/Logo': { areaId: 'footerTop' } })).toEqual({ areaId: 'footerTop', sortOrder: 10 });
  });
  it('ignores entries for other components', () => {
    expect(applyThemeLayout('/x/all/Logo.js', base, { 'all/WrongOrNotExistComponent': { sortOrder: 1 } })).toEqual(base);
  });
});

describe('parseThemeLayouts (loose)', () => {
  it('drops anything that is not a map of partial layouts', () => {
    const text = JSON.stringify({
      'all/Logo': { areaId: 'headerMiddleLeft', sortOrder: '5' },
      'all/SearchBox': 'headerBottom',
      'all/Breadcrumb': { areaId: 42, sortOrder: 'soon' },
      'all/Empty': {},
      'all/List': [1, 2]
    });
    expect(parseThemeLayouts(text)).toEqual({ 'all/Logo': { areaId: 'headerMiddleLeft', sortOrder: 5 } });
  });
  it('returns {} for invalid JSON or a non-object document', () => {
    expect(parseThemeLayouts('{ not json')).toEqual({});
    expect(parseThemeLayouts('[]')).toEqual({});
    expect(parseThemeLayouts('"all/Logo"')).toEqual({});
  });
});

describe('loadThemeLayouts', () => {
  it('reads a file and returns {} when it is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'layouts-'));
    const file = join(dir, 'layouts.json');
    expect(loadThemeLayouts(join(dir, 'missing.json'))).toEqual({});
    writeFileSync(file, JSON.stringify({ 'all/Logo': { sortOrder: 2 } }));
    expect(loadThemeLayouts(file)).toEqual({ 'all/Logo': { sortOrder: 2 } });
  });
});
