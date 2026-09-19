import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Per-route undo/redo isolation (spec § 5.1, § 5.4).
 *
 * `changeset.route_cursors` is a JSONB map `{ route → highest applied
 * change_order }`. Undo on route X moves cursor[X] only; cursor[Y]
 * untouched. The `loadActiveOps` query then filters per-route:
 *   op.change_order <= cursor[op.route]
 *
 * Test seeds two ops on `homepage` (cursor → 2) AND two on `cart`
 * (cursor → 4). Opens the editor on homepage, presses Undo. Verifies:
 *
 *   homepage cursor: 2 → 1 (one step back)
 *   cart cursor:     4 → 4 (UNTOUCHED — the assertion that proves isolation)
 *
 * Why this matters: a single global undo would corrupt edits on other
 * routes. Without the per-route invariant, navigating to cart and
 * pressing Undo on a homepage-only change would silently retreat
 * cart's history.
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

test.describe('undo / redo / per-route isolation', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('undo on homepage retreats homepage cursor, leaves cart untouched', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    // Two ops on homepage → homepage cursor = 2.
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'separator'
    });

    // Two ops on cart → cart cursor = 4 (change_order is globally
    // monotonic — see addChangesetOperation.ts line 138-142).
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'cart',
      placementRoute: 'cart',
      area: 'content',
      widgetType: 'separator'
    });

    expect(await readRouteCursor(changesetId!, 'homepage')).toBe(2);
    expect(await readRouteCursor(changesetId!, 'cart')).toBe(4);

    // Reload so the editor's canUndo state for homepage reflects the seed.
    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });
    await expect(editor.undoButton).toBeEnabled({ timeout: 5_000 });

    // Click Undo — moveCurrentChange sees route='homepage' (the route
    // we're editing) and only walks homepage ops.
    await editor.undoButton.click();

    // Homepage cursor retreats one step.
    await expect
      .poll(() => readRouteCursor(changesetId!, 'homepage'))
      .toBe(1);
    // Cart cursor untouched — the isolation invariant.
    expect(await readRouteCursor(changesetId!, 'cart')).toBe(4);
  });
});
