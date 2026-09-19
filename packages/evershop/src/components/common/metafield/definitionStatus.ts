/**
 * Pure status computation for the page-builder guideline drawer — dependency
 * free so the node jest environment can test it.
 *
 * `declared` is the theme's projection descriptor carried in the
 * `metafield-select` bridge message (built server-side from the active
 * theme's manifest); `existing` is the definition row from
 * GET /api/metafield-definitions. Only type/isList can conflict here —
 * ownerType/namespace/key matched by lookup, and those two are the
 * remaining immutables (`updateMetafieldDefinition` rejects changing them).
 */

export interface DeclaredDescriptorLike {
  type: string;
  isList?: boolean;
}

export interface ExistingDefinitionLike {
  type: string;
  isList?: boolean;
}

export type DefinitionStatus =
  | { kind: 'exists' }
  | { kind: 'exists-undeclared' }
  | { kind: 'missing-declared' }
  | { kind: 'missing-undeclared' }
  | {
      kind: 'conflict';
      details: Array<{
        field: 'type' | 'isList';
        declared: unknown;
        existing: unknown;
      }>;
    };

const norm = (t: string | undefined | null): string =>
  typeof t === 'string' ? t.toLowerCase() : '';

export function computeDefinitionStatus(
  declared: DeclaredDescriptorLike | null | undefined,
  existing: ExistingDefinitionLike | null | undefined
): DefinitionStatus {
  if (!declared) {
    return existing
      ? { kind: 'exists-undeclared' }
      : { kind: 'missing-undeclared' };
  }
  if (!existing) {
    return { kind: 'missing-declared' };
  }
  const details: Array<{
    field: 'type' | 'isList';
    declared: unknown;
    existing: unknown;
  }> = [];
  if (norm(declared.type) !== norm(existing.type)) {
    details.push({
      field: 'type',
      declared: declared.type,
      existing: existing.type
    });
  }
  if ((declared.isList ?? false) !== (existing.isList ?? false)) {
    details.push({
      field: 'isList',
      declared: declared.isList ?? false,
      existing: existing.isList ?? false
    });
  }
  return details.length > 0
    ? { kind: 'conflict', details }
    : { kind: 'exists' };
}
