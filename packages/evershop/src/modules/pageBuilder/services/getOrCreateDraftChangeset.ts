import { insert } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../lib/postgres/connection.js';

/**
 * Per spec 03 § 5.7 + spec 04 § 9.5: one open draft changeset per
 * (admin user, theme). The draft is named `pb-draft-<userId>` and reused
 * until the user publishes it (which sets `published_at`), saves it as a
 * rollout plan, or explicitly discards it.
 *
 * Theme is part of the draft identity, not the name: the same admin editing
 * under theme A and under theme B gets two distinct `pb-draft-<userId>`
 * rows, one per theme bucket. The caller captures the active theme once
 * (`getActiveTheme()`) and passes it in; it is stamped at creation and never
 * updated for the life of the draft (the "sticky theme" contract, § 9.5).
 *
 * The caller still tracks the current route in editor state — that is a
 * UI concern, not part of the draft identity. A single changeset can
 * carry operations against multiple routes (each `changeset_operation`
 * row carries its own `route` column).
 */
export async function getOrCreateDraftChangeset(opts: {
  userId: number;
  theme: string | null;
}): Promise<{
  changeset_id: number;
  uuid: string;
  token: string;
  theme: string | null;
}> {
  const { userId, theme } = opts;
  const name = `pb-draft-${userId}`;

  // Plain pool.query — the typed builder doesn't compose `IS NULL` /
  // `IS NOT DISTINCT FROM` cleanly with parameter binding; literal SQL keeps
  // it valid. `theme IS NOT DISTINCT FROM $2` matches the NULL bucket too.
  //
  // Defensive `NOT EXISTS` against rollout_plan: if a previous "Save as
  // rollout plan" left the draft attached to a rollout (createRolloutPlan
  // now renames on success, but old rows from before that fix may still be
  // tangled), skip it so the user gets a fresh draft instead of the rollout
  // bleeding into the draft session.
  const existing = await pool.query(
    `SELECT changeset_id, uuid, token, theme
       FROM changeset
      WHERE name = $1
        AND theme IS NOT DISTINCT FROM $2
        AND published_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM rollout_plan rp
           WHERE rp.changeset_id = changeset.changeset_id
        )
      LIMIT 1`,
    [name, theme]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return {
      changeset_id: row.changeset_id,
      uuid: row.uuid,
      token: row.token,
      theme: row.theme ?? null
    };
  }

  // INSERT may race with a concurrent request from the same admin: both
  // SELECTs find nothing, both attempt to INSERT, the second is rejected
  // by the partial unique index `idx_changeset_user_theme_open` added in
  // Version-1.1.0 (one open draft per (created_by, theme) pair). When
  // that happens, fall back to a follow-up SELECT — the competing
  // request just committed the draft, and we can return its row instead
  // of bubbling the error up to the editor entry handler.
  //
  // The unique constraint code for partial unique index violations is
  // Postgres `23505`. Anything else re-throws.
  try {
    const created = await insert('changeset')
      .given({
        uuid: uuidv4(),
        name,
        token: uuidv4(),
        theme,
        created_by: userId
      })
      .execute(pool);
    return {
      changeset_id: (created as any).changeset_id,
      uuid: (created as any).uuid,
      token: (created as any).token,
      theme: ((created as any).theme as string | null) ?? null
    };
  } catch (err) {
    if ((err as { code?: string }).code !== '23505') throw err;
    // A concurrent request for the same (admin, theme) won the INSERT race
    // for this draft bucket. The draft-scoped unique index
    // (`idx_changeset_user_theme_open`, predicate
    // `published_at IS NULL AND name LIKE 'pb-draft-%'`) rejects only a
    // second *draft* row in the same theme bucket, so the winner is the
    // `pb-draft-<id>` that just committed — re-run the same lookup to
    // return it.
    //
    // Deliberately match on `name` + `theme`, NOT just `created_by`: a
    // rollout-backed changeset can share `created_by` and sit open in the
    // same theme bucket. Returning that here would pin the editor to the
    // admin's scheduled rollout instead of their draft. The draft-scoped
    // index lets the two coexist, so an INSERT only collides with another
    // draft of the same theme.
    const raced = await pool.query(
      `SELECT changeset_id, uuid, token, theme
         FROM changeset
        WHERE name = $1
          AND theme IS NOT DISTINCT FROM $2
          AND published_at IS NULL
        ORDER BY changeset_id DESC
        LIMIT 1`,
      [name, theme]
    );
    if (raced.rows.length === 0) throw err;
    const row = raced.rows[0];
    return {
      changeset_id: row.changeset_id,
      uuid: row.uuid,
      token: row.token,
      theme: row.theme ?? null
    };
  }
}
