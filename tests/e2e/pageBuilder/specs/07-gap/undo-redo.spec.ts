import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Per-route undo/redo. The topbar buttons trigger `handleMoveCurrent`,
 * which POSTs to `/api/page-builder/changesets/:id/move-current` and
 * advances or retreats `changeset.route_cursors[route]`. The storefront
 * overlay query (`loadActiveOps`) gates each op by `op.change_order <=
 * cursors[op.route]`, so the cursor IS the source of truth — verifying
 * undo/redo means watching the cursor move.
 *
 * Why DB-level instead of UI-level assertions: the iframe's rendered
 * DOM changes on undo/redo, but it does so via an SSR refetch with a
 * settling delay that varies (200-800ms). The cursor change is
 * synchronous with the move-current response, which makes for a
 * deterministic assertion.
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

async function readRouteCursor(
  changesetId: number,
  route: string
): Promise<number> {
  const db = getDb();
  const { rows } = await db.query<{ cursor: number | null }>(
    `SELECT (route_cursors ->> $2)::int AS cursor
     FROM changeset
     WHERE changeset_id = $1`,
    [changesetId, route]
  );
  return rows[0]?.cursor ?? 0;
}

test.describe('undo / redo', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('undo retreats then redo re-advances the route cursor', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    // Seed two ops on the current route ('homepage'). The editor's
    // canUndo/canRedo GraphQL query is route-scoped — it checks ops
    // tagged with the route the user is editing, not all changeset ops.
    // The placement's own `route` field (in the payload) tracks where
    // the widget renders, separately from the op's tracking route.
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'separator'
    });

    // Reload so the editor's `canUndo`/`canRedo` GraphQL state reflects
    // the seeded ops. The handler reads `cursor < max_change_order` for
    // canRedo and `cursor > 0` for canUndo on the current route.
    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    // Cursor for 'homepage' should now be at 2 (placement op).
    expect(await readRouteCursor(changesetId!, 'homepage')).toBe(2);

    await expect(editor.undoButton).toBeEnabled({ timeout: 5_000 });
    await editor.undoButton.click();
    await expect
      .poll(() => readRouteCursor(changesetId!, 'homepage'))
      .toBe(1);

    // Second undo retreats to 0 — the widget_instance op is gone too.
    await expect(editor.undoButton).toBeEnabled();
    await editor.undoButton.click();
    await expect
      .poll(() => readRouteCursor(changesetId!, 'homepage'))
      .toBe(0);

    // Undo button disabled when cursor is at 0.
    await expect(editor.undoButton).toBeDisabled({ timeout: 5_000 });

    // Redo re-advances back through the chain.
    await expect(editor.redoButton).toBeEnabled();
    await editor.redoButton.click();
    await expect
      .poll(() => readRouteCursor(changesetId!, 'homepage'))
      .toBe(1);

    await editor.redoButton.click();
    await expect
      .poll(() => readRouteCursor(changesetId!, 'homepage'))
      .toBe(2);

    // Redo button disabled when there's nothing left to redo.
    await expect(editor.redoButton).toBeDisabled({ timeout: 5_000 });
  });
});
