import { existsSync, readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../helpers.js';
import { getEnabledTheme } from '../util/getEnabledTheme.js';

/**
 * Theme layout overrides — `themes/<id>/layouts.json`.
 *
 * A page component's position lives in its own `export const layout =
 * { areaId, sortOrder }`. The active theme may move any storefront page
 * component without forking its file by listing it here, keyed the way the
 * component trees are merged: `<routeFolder>/<Name>` (`all/Logo`,
 * `productView/ProductView`, `productEdit+productNew/Title`). Values are
 * partial — `areaId`, `sortOrder`, or both — and win over the file's own
 * literal, whichever tree (core, extension, theme) supplied the file.
 *
 * The map is read at build time (production emitter, dev loader) and is
 * deliberately loose: a missing or malformed file, an entry that matches no
 * component, or a value of the wrong shape is ignored without a word.
 * Themes never affect admin routes, so callers skip admin routes.
 */
export interface LayoutOverride {
  areaId?: string;
  sortOrder?: number;
}

export interface ComponentLayout {
  areaId: string;
  sortOrder: number;
}

export type ThemeLayouts = Record<string, LayoutOverride>;

export const THEME_LAYOUTS_FILE = 'layouts.json';

/** `<routeFolder>/<Name>` for a page component file path, or null. */
export function layoutKeyOf(componentPath: string): string | null {
  const parts = String(componentPath).split(/[\\/]+/).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  const name = parts[parts.length - 1].replace(/\.[^.]+$/, '');
  const folder = parts[parts.length - 2];
  return name && folder ? `${folder}/${name}` : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse the file content loosely: anything that is not a map of objects becomes {} / is dropped. */
export function parseThemeLayouts(text: string): ThemeLayouts {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {};
  }
  if (!isPlainObject(parsed)) {
    return {};
  }
  const out: ThemeLayouts = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!isPlainObject(value)) {
      continue;
    }
    const entry: LayoutOverride = {};
    if (typeof value.areaId === 'string' && value.areaId.trim().length > 0) {
      entry.areaId = value.areaId.trim();
    }
    const sortOrder =
      typeof value.sortOrder === 'number' || typeof value.sortOrder === 'string'
        ? Number(value.sortOrder)
        : NaN;
    if (Number.isFinite(sortOrder)) {
      entry.sortOrder = sortOrder;
    }
    if (entry.areaId !== undefined || entry.sortOrder !== undefined) {
      out[key] = entry;
    }
  }
  return out;
}

const cache = new Map<string, { mtimeMs: number; layouts: ThemeLayouts }>();

/**
 * The active theme's layout overrides, or {} when there is no theme, no
 * file, or nothing usable in it. Pass `file` to read a specific file (the
 * lab generator does); by default the file is `themes/<active>/layouts.json`.
 * Cached by the file's modification time, so the dev loader (which re-runs on
 * every recompile) sees an edit as soon as `ThemeWatcherPlugin` triggers the
 * recompile — no restart. Production reads it once per build.
 */
export function loadThemeLayouts(file?: string): ThemeLayouts {
  let target = file;
  if (!target) {
    const theme = getEnabledTheme();
    if (!theme) {
      return {};
    }
    target = resolve(CONSTANTS.THEMEPATH, theme.name, THEME_LAYOUTS_FILE);
  }
  if (!existsSync(target)) {
    cache.delete(target);
    return {};
  }
  let mtimeMs: number;
  try {
    mtimeMs = statSync(target).mtimeMs;
  } catch {
    return {};
  }
  const cached = cache.get(target);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.layouts;
  }
  let layouts: ThemeLayouts = {};
  try {
    layouts = parseThemeLayouts(readFileSync(target, 'utf8'));
  } catch {
    layouts = {};
  }
  cache.set(target, { mtimeMs, layouts });
  return layouts;
}

/** The layout the emitters should use for `componentPath`: the theme's override over the file's literal. */
export function applyThemeLayout(
  componentPath: string,
  layout: ComponentLayout,
  overrides: ThemeLayouts
): ComponentLayout {
  const key = layoutKeyOf(componentPath);
  if (!key) {
    return layout;
  }
  const override = overrides[key];
  if (!override) {
    return layout;
  }
  return {
    ...layout,
    areaId: override.areaId ?? layout.areaId,
    sortOrder: override.sortOrder ?? layout.sortOrder
  };
}
