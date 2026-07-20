/**
 * Pure render-decision core for <Metafield> — kept dependency-free so it can
 * be unit-tested in the node jest environment (no @components imports here).
 *
 * Inputs are the two per-render lookups:
 *   - `descriptor`: the active theme's DECLARED field from the
 *     manifest-descriptor projection (eContext.config.themeMetafieldDescriptors)
 *   - `entry`: the ACTUAL shaped metafield from the entity's GraphQL data
 *     (`metafields { namespace key type value }`)
 *
 * The matrix (theme-metafields design § V1b):
 *   declared + visibleToCustomer:false → hidden (never the default — the
 *     customer GraphQL response omits hidden fields, so `value ?? default`
 *     would otherwise render a private field's default publicly)
 *   value present, type matches        → value
 *   absent / unset                     → defaultValue ?? placeholder
 *   resolved type ≠ declared type      → default (conflict-skipped incumbent)
 *   undeclared key                     → GraphQL-only best effort
 */

export interface ShapedMetafieldEntry {
  namespace: string;
  key: string;
  /** GraphQL returns the enum NAME (e.g. "SHORT_TEXT"); normalized here. */
  type?: string | null;
  value?: unknown;
}

export interface ProjectedDescriptorLike {
  type: string;
  isList?: boolean;
  visibleToCustomer: boolean;
  name?: string;
  description?: string;
  placeholder?: string;
}

export interface MetafieldMeta {
  /** Normalized (lowercase) field type, declared-first. */
  type?: string;
  isList?: boolean;
  name?: string;
  placeholder?: string;
  /** True when the rendered value is a fallback, not stored data. */
  isDefault: boolean;
}

export type MetafieldResolution =
  | { kind: 'hidden' }
  | { kind: 'value'; value: unknown; meta: MetafieldMeta; warn?: string }
  | { kind: 'default'; value: unknown; meta: MetafieldMeta; warn?: string }
  | { kind: 'empty'; warn?: string };

const normalizeType = (t: string | null | undefined): string | undefined =>
  typeof t === 'string' && t.length > 0 ? t.toLowerCase() : undefined;

export function resolveMetafield(opts: {
  ref: string;
  descriptor?: ProjectedDescriptorLike;
  entry?: ShapedMetafieldEntry;
  defaultValue?: unknown;
}): MetafieldResolution {
  const { ref, descriptor, entry, defaultValue } = opts;

  if (descriptor && descriptor.visibleToCustomer === false) {
    return { kind: 'hidden' };
  }

  const entryType = normalizeType(entry?.type);
  // Normalize BOTH sides: GraphQL sends the enum NAME (SHORT_TEXT) and a
  // hand-written manifest may carry any casing — a case difference must not
  // read as a type conflict and suppress a genuinely stored value.
  const declaredType = normalizeType(descriptor?.type);
  const typeMismatch = Boolean(
    descriptor && entryType && declaredType && entryType !== declaredType
  );

  const meta = (isDefault: boolean): MetafieldMeta => ({
    type: descriptor?.type ?? entryType,
    ...(descriptor?.isList ? { isList: true } : {}),
    ...(descriptor?.name ? { name: descriptor.name } : {}),
    ...(descriptor?.placeholder ? { placeholder: descriptor.placeholder } : {}),
    isDefault
  });

  const stored = typeMismatch ? undefined : entry?.value;
  if (stored !== undefined && stored !== null) {
    return { kind: 'value', value: stored, meta: meta(false) };
  }

  let warn: string | undefined;
  if (typeMismatch) {
    warn =
      `<Metafield> "${ref}": stored type "${entryType}" does not match the ` +
      `declared "${declaredType}" (an incompatible definition already ` +
      `existed when the theme provisioned — see theme:status); rendering the default`;
  } else if (descriptor && !entry) {
    warn =
      `<Metafield> "${ref}": declared by the theme but absent from the ` +
      `entity data — either the definition is not provisioned yet (boot/` +
      `theme:active pending) or the enclosing query does not select metafields`;
  }

  const fallback =
    defaultValue !== undefined ? defaultValue : descriptor?.placeholder;
  if (fallback !== undefined) {
    return { kind: 'default', value: fallback, meta: meta(true), warn };
  }
  return { kind: 'empty', warn };
}
