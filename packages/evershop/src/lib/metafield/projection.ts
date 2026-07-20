import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CONSTANTS } from '../helpers.js';
import { error } from '../log/logger.js';
import { getConfig } from '../util/getConfig.js';
import { refOf } from './provision.js';
import type { ManifestMetafieldDefinition } from './provision.js';
import type { MetafieldType } from './types.js';

/**
 * The manifest-descriptor projection — what the storefront `<Metafield>`
 * component knows about the active theme's DECLARED fields, independently of
 * what the DB currently holds. Keyed `owner.namespace.key`.
 *
 * Why it exists: the customer-audience GraphQL response cannot distinguish
 * "unset" from "hidden" from "not defined yet" (hidden/undefined fields are
 * simply absent), so without the declaration a `visibleToCustomer: false`
 * field's `value ?? defaultValue` would render its default PUBLICLY — the
 * opposite of the privacy rule. The projection also carries the declared
 * type (mismatch guard) and `appearance.placeholder` (the single default
 * source, Decision 5 of the theme-metafields design).
 */
export interface ProjectedDescriptor {
  type: MetafieldType;
  isList?: boolean;
  visibleToCustomer: boolean;
  name: string;
  description?: string;
  placeholder?: string;
}

export type MetafieldProjection = Record<string, ProjectedDescriptor>;

/** Pure: manifest entries → projection map. Exported for tests. */
export function buildProjection(
  entries: ManifestMetafieldDefinition[]
): MetafieldProjection {
  const out: MetafieldProjection = {};
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.ownerType !== 'string' ||
      typeof entry.namespace !== 'string' ||
      typeof entry.key !== 'string' ||
      typeof entry.type !== 'string'
    ) {
      continue;
    }
    const placeholder = (entry.appearance as { placeholder?: unknown })
      ?.placeholder;
    out[refOf(entry)] = {
      type: entry.type,
      ...(entry.isList ? { isList: true } : {}),
      visibleToCustomer: entry.visibleToCustomer ?? true,
      name: entry.name,
      ...(entry.description ? { description: entry.description } : {}),
      ...(typeof placeholder === 'string' ? { placeholder } : {})
    };
  }
  return out;
}

/**
 * Read the active theme's manifest synchronously and build the projection.
 * Sync on purpose: the delivery seam is the `appConfig` registry processor,
 * and `getValueSync` rejects Promise-valued processors — so the projection is
 * computed once at bootstrap and merely merged per request. The theme is
 * fixed for the process lifetime; a manifest edit needs a restart anyway
 * (dev watch restarts, and boot-time provisioning re-reads it too).
 * Never throws — a broken manifest must not break rendering.
 */
export function loadThemeMetafieldProjection(): MetafieldProjection {
  try {
    const themeName = getConfig('system.theme') as string | undefined;
    if (!themeName) return {};
    const file = resolve(CONSTANTS.THEMEPATH, themeName, 'theme.json');
    let raw: string;
    try {
      raw = readFileSync(file, 'utf8');
    } catch {
      return {};
    }
    const manifest = JSON.parse(raw) as {
      metafieldDefinitions?: ManifestMetafieldDefinition[];
    };
    if (!Array.isArray(manifest.metafieldDefinitions)) return {};
    return buildProjection(manifest.metafieldDefinitions);
  } catch (e) {
    error(e as Error);
    return {};
  }
}
