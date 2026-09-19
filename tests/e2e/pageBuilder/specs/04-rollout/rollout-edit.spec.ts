import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanupTestRolloutPlans,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import {
  insertRolloutPlanDirect,
  seedWidgetPlacement
} from '../../../shared/pbApi.js';
import { editor as editorSel } from '../../../shared/selectors.js';

/**
 * Rollout-edit mode (spec § 5.9.3). The editor accepts
 * `?session=<rollout-uuid>` and pins itself to that rollout's changeset.
 * The topbar swaps the Publish split-button for a Save split-button —
 * see `PrimaryActionButton.tsx` rollout-mode branch.
 *
 * "Save" in rollout-edit mode posts to /api/page-builder/rollout-plans/
 * :id/sync, which copies `changeset.route_cursors` into
 * `rollout_plan.route_cursors`. The storefront reads from the rollout's
 * cursors (`loadActiveOps.ts:51`), so until the user clicks Save, edits
 * stay in the editor and don't bleed onto the live storefront.
 *
 * Test exercises one full cycle:
 *   - Seed changeset + rollout (empty rp.route_cursors)
 *   - Land on editor via ?session=<uuid>
 *   - Topbar shows Save (enabled — cs cursors > rp cursors)
 *   - Click Save → rp.route_cursors catches up to cs.route_cursors
 *   - Save now disabled (nothing to sync)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_META_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '.auth',
  'admin.meta.json'
);
function loadAdminUserId(): number {
  return (
    JSON.parse(readFileSync(ADMIN_META_PATH, 'utf8')) as {
      adminUserId: number;
    }
  ).adminUserId;
}

async function readRolloutCursors(
  rolloutPlanId: number
): Promise<Record<string, number>> {
  const db = getDb();
  const { rows } = await db.query<{ cursors: Record<string, number> }>(
    `SELECT route_cursors AS cursors FROM rollout_plan WHERE rollout_plan_id = $1`,
    [rolloutPlanId]
  );
  return rows[0]?.cursors ?? {};
}

test.describe('rollout / edit mode', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
    await cleanupTestRolloutPlans();
  });

  test('?session=<uuid> pins editor + Save syncs rp.route_cursors', async ({
    page,
    request
  }) => {
    const adminUserId = loadAdminUserId();
    const db = getDb();

    // 1. Seed a changeset with one widget+placement op on homepage so
    //    `changeset.route_cursors.homepage = 2`.
    const { rows: csRows } = await db.query<{
      changeset_id: number;
      uuid: string;
    }>(
      `INSERT INTO changeset (name, route_cursors, token, created_by)
       VALUES ($1, $2::jsonb, $3, $4)
       RETURNING changeset_id, uuid`,
      [
        'e2e-rollout-edit-cs',
        JSON.stringify({}),
        randomUUID(),
        adminUserId
      ]
    );
    const csId = csRows[0].changeset_id;
    await seedWidgetPlacement(request, {
      changesetId: csId,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'separator'
    });

    // 2. Create a rollout plan pointing at the changeset, empty cursors.
    //    Far-future window so it doesn't conflict with any other plan in
    //    the dev DB.
    const startTime = new Date(Date.now() + 200 * 24 * 3600_000);
    const endTime = new Date(Date.now() + 230 * 24 * 3600_000);
    const { rolloutPlanId } = await insertRolloutPlanDirect({
      name: 'e2e-rollout-edit-plan',
      changesetId: csId,
      routeCursors: {},
      startTime,
      endTime
    });

    // Read the rollout's UUID — the editor uses uuid (not numeric id)
    // as the session param.
    const { rows: planRows } = await db.query<{ uuid: string }>(
      `SELECT uuid FROM rollout_plan WHERE rollout_plan_id = $1`,
      [rolloutPlanId]
    );
    const rolloutUuid = planRows[0].uuid;

    // 3. Navigate to the rollout-edit URL. SessionPicker is auto-
    //    acknowledged by the useEffect at Editor.tsx:447, so we just
    //    wait for the topbar.
    await page.goto(
      `/admin/page-builder/edit/homepage?session=${encodeURIComponent(rolloutUuid)}`
    );
    await expect(page.locator(editorSel.topbar)).toBeVisible({
      timeout: 15_000
    });

    // 4. Verify the topbar shows Save (rollout mode), not Publish.
    const topbar = page.locator(editorSel.topbar);
    const saveBtn = topbar.getByRole('button', {
      name: 'Save',
      exact: true
    });
    await expect(saveBtn).toBeVisible();
    // Publish should NOT be present in this mode.
    await expect(
      topbar.getByRole('button', { name: 'Publish', exact: true })
    ).toHaveCount(0);

    // 5. Save is enabled because cs.route_cursors.homepage (2)
    //    diverges from rp.route_cursors.homepage (0/undefined).
    await expect(saveBtn).toBeEnabled();
    expect(await readRolloutCursors(rolloutPlanId)).toEqual({});

    // 6. Click Save → POST sync → rp.route_cursors copies cs.route_cursors.
    await saveBtn.click();
    await expect
      .poll(() => readRolloutCursors(rolloutPlanId), { timeout: 5_000 })
      .toEqual({ homepage: 2 });

    // 7. Now the editor and rollout match — Save is disabled.
    await expect(saveBtn).toBeDisabled({ timeout: 5_000 });
  });
});
