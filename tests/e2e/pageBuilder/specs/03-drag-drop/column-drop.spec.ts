import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countOperations,
  getActiveChangesetId
} from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * Drop INTO a column container.
 *
 * Each Columns widget renders one synthetic `<Area>` per column, IDs
 * `columnsContainer_<columnsUid>_col_<index>` (see `Columns.tsx:165`).
 * The column area itself isn't marked `isGlobal` — BUT it's nested
 * inside the homepage's `content` area, which IS global
 * (`base/.../Base.tsx:52`). `AreaStartDropZone.onDrop` derives
 * `isGlobal` from `zone.closest('[data-evershop-global="true"]')`,
 * which walks up the DOM and finds the outer global wrapper. Net
 * effect for direct drag-drop: a child dropped into a column nested
 * under a global Area defaults to `route='all'`.
 *
 * (The `pendingParent` flow — clicking the column's "Add widget"
 * placeholder and picking from the palette — has different semantics:
 * `Editor.tsx:1056` mirrors the parent placement's route. That path
 * is exercised by separate tests, not here.)
 *
 * Verifies:
 *   - placement.area === `columnsContainer_<columnsUid>_col_0`
 *   - placement.route === 'all' (global inherited via DOM ancestor)
 *   - widget_instance + widget_placement INSERT ops both land
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

test.describe('drag-drop / column container', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('drop into columnsContainer_<uid>_col_0 → child placement uses synthetic area', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const palette = new PaletteTab(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    // 1. Seed a Columns parent in the homepage `content` area. Match
    //    the bootstrap defaults so the renderer doesn't choke on missing
    //    settings.
    const { widgetUuid: columnsUuid } = await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'columns',
      widgetSettings: {
        columnCount: 2,
        gap: 16,
        ratio: '1-1',
        background: null,
        padding: 'none',
        contentPosition: 'mc'
      }
    });

    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    const opsBefore = await countOperations(changesetId!);

    // 2. Drop a Text block into the first column's synthetic area.
    const columnArea = `columnsContainer_${columnsUuid}_col_0`;
    await palette.dragToArea('Text block', 'text_block', columnArea);

    // 3. Two new ops land (widget_instance + widget_placement).
    await expect
      .poll(() => countOperations(changesetId!), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(opsBefore + 2);

    // 4. The latest placement targets the synthetic column area.
    //    Route is 'all' because the drop zone's closest
    //    [data-evershop-global="true"] ancestor is the outer content
    //    area (see docstring above).
    const db = getDb();
    const { rows } = await db.query<{
      route: string;
      area: string;
    }>(
      `SELECT (new_payload->>'route') AS route,
              (new_payload->>'area') AS area
       FROM changeset_operation
       WHERE changeset_id = $1
         AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
         AND new_payload IS NOT NULL
       ORDER BY change_order DESC LIMIT 1`,
      [changesetId]
    );
    expect(rows[0].area).toBe(columnArea);
    expect(rows[0].route).toBe('all');
  });
});
