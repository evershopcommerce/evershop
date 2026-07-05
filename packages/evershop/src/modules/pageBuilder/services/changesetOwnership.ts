/**
 * Ownership rule for changeset mutations (add-op / publish / discard / undo).
 *
 * A **personal draft** (`name` like `pb-draft-<id>`) belongs to the admin who
 * opened it — its preview token overlays that admin's unpublished work, so a
 * different admin must not add ops to it, publish it, discard it, or move its
 * cursor. The editor only ever loads the current admin's own draft
 * (`getOrCreateDraftChangeset({ userId })`), so this guard blocks only the
 * cross-admin IDOR (a hand-crafted request against someone else's changeset
 * id), never a normal flow.
 *
 * **Rollout-backed** changesets are shared operational objects — any admin may
 * manage them (matching the theme-scoped rollout list), so they are exempt.
 */
export function isForeignDraft(
  changeset: { name?: string | null; created_by?: number | null } | null,
  userId: number | null | undefined
): boolean {
  if (!changeset) return false;
  const name = (changeset.name ?? '') as string;
  const isDraft = name.startsWith('pb-draft-');
  const owner = (changeset.created_by ?? null) as number | null;
  return isDraft && owner != null && owner !== userId;
}
