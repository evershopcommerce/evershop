import { statSync } from 'node:fs';
import type { GraphQLSchema } from 'graphql';
import JSON5 from 'json5';
import { get } from '../util/get.js';
import { parseGraphqlByFile } from '../webpack/util/parseGraphqlByFile.js';
import {
  checkVariables,
  describeUnknownKey,
  type VariableCheck,
  type VariableDefinition
} from './variableCheck.js';

/**
 * How a widget's saved settings become the variables of its page query, and the
 * check that follows (see `variableCheck.ts`).
 *
 * The page-query middleware does this per request from the build output. A save
 * has no build output to lean on (and `theme:active` runs without one), so a
 * widget's declarations are read from its compiled component file, with the same
 * parser the build uses. Both go through `resolveSettingRef`, so a setting
 * cannot mean one thing when it is saved and another when it is rendered.
 */

/** What a component's `export const query` / `export const variables` declare. */
export interface WidgetVariableSpec {
  defs: VariableDefinition[];
  /** The declared value of each variable by alias: a literal, or a `getWidgetSetting_…` reference. */
  raw: Record<string, unknown>;
}

const SETTING_REF = /getWidgetSetting_([a-zA-Z0-9+/=]*)/;

/**
 * Resolve one declared variable value against a widget's settings.
 *
 *  - not a string: a literal, used as it is
 *  - a string holding `getWidgetSetting("a.b")`: the setting at that path, or the
 *    whole settings object when the path is empty
 *  - any other string: not passed (the page-query middleware has always dropped it)
 */
export function resolveSettingRef(
  raw: unknown,
  settings: Record<string, unknown>
): { found: boolean; value?: unknown } {
  if (typeof raw !== 'string') {
    return { found: true, value: raw };
  }
  const match = SETTING_REF.exec(raw);
  if (!match) {
    return { found: false };
  }
  const path = Buffer.from(match[1], 'base64')
    .toString('ascii')
    .split(',')[0]
    .replace(/['"]+/g, '');
  return { found: true, value: path.trim() ? get(settings, path) : settings };
}

const specCache = new Map<
  string,
  { mtimeMs: number; spec: WidgetVariableSpec | null }
>();

/**
 * Read a widget's variable declarations from its compiled component file. Kept
 * per file version, so a rebuilt file is read again and nothing else is.
 * Returns null when the file cannot be read or parsed: a caller that only wants
 * to validate then skips the widget rather than blocking a save on tooling.
 */
export function getWidgetVariableSpec(
  componentPath: string
): WidgetVariableSpec | null {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(componentPath).mtimeMs;
  } catch {
    return null;
  }
  const cached = specCache.get(componentPath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.spec;
  }
  let spec: WidgetVariableSpec | null;
  try {
    const { variables } = parseGraphqlByFile(componentPath);
    spec = {
      defs: variables?.definitions ?? [],
      raw: JSON5.parse(variables?.source ?? '{}')
    };
  } catch {
    spec = null;
  }
  specCache.set(componentPath, { mtimeMs, spec });
  return spec;
}

/** The value each of the widget's variables would get from `settings`, by alias. */
export function widgetVariableValues(
  spec: WidgetVariableSpec,
  settings: Record<string, unknown>
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const def of spec.defs) {
    const resolved = resolveSettingRef(spec.raw[def.alias], settings);
    if (resolved.found) {
      values[def.alias] = resolved.value;
    }
  }
  return values;
}

/** Check a widget's settings against the schema as it is now. */
export function checkWidgetSettings(
  schema: GraphQLSchema,
  spec: WidgetVariableSpec,
  settings: Record<string, unknown>
): VariableCheck {
  return checkVariables(schema, spec.defs, widgetVariableValues(spec, settings));
}

/**
 * What a SAVE should refuse: every message, or none when the settings are fine.
 *
 * Pass `previous`, the settings already stored, when updating. Whatever the
 * stored settings already got wrong is not blamed on this update: a merchant who
 * edits one slide must not be locked out because an older version of the schema
 * let a key through that the page builder cannot show, let alone remove. Only
 * what the update itself introduces is refused. (The page still renders: the
 * render path drops such keys.)
 */
export function findSettingsProblems(
  schema: GraphQLSchema,
  spec: WidgetVariableSpec,
  settings: Record<string, unknown>,
  previous?: Record<string, unknown> | null
): string[] {
  const now = checkWidgetSettings(schema, spec, settings);
  const before = previous ? checkWidgetSettings(schema, spec, previous) : null;
  const oldKeys = new Set(before?.unknownKeys.map((k) => k.path));
  const oldProblems = new Set(before?.problems.map((p) => p.message));
  return [
    ...now.unknownKeys.filter((k) => !oldKeys.has(k.path)).map(describeUnknownKey),
    ...now.problems.filter((p) => !oldProblems.has(p.message)).map((p) => p.message)
  ];
}
