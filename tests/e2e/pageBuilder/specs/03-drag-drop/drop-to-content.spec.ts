import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countOperations,
  getActiveChangesetId
} from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * Cross-frame drag-drop matrix. Five widget types × two storefront
 * areas exposed on the homepage (`headerTop` + `content`). Both areas
 * are marked `<Area isGlobal>` in `modules/base/.../Base.tsx`, so the
 * drop-zone reports `isGlobal: true` and the editor defaults the new
 * placement to `route='all'`. The matrix asserts:
 *
 *   - widget_instance + widget_placement ops both land
 *   - placement.area matches the drop target
 *   - placement.route === 'all' (global default)
 *   - placement.sort_order is finite (exact value depends on pre-rendered
 *     siblings — see `dropSortOrder.ts`; we just confirm the editor wrote
 *     a numeric value, not the placeholder)
 *
 * Widget pool kept to "safe" widgets — no required image, no nested
 * containers — so a fresh drop renders without further configuration.
 * Each widget is named `e2e-<type>` by the editor's add-widget handler
 * (see `pageBuilder/pages/admin/pageBuilderEdit/Editor.tsx`) — global
 * teardown sweeps them.
 *
 * The non-global / into-column branches of the drop logic are out of
 * scope here:
 *   - The homepage doesn't expose a non-global area at the top level
 *     (Header, Content, Footer are all global).
 *   - Into-column drops require a pre-seeded Columns widget and use a
 *     different message shape (`pendingParent`). Covered separately
 *     when we expand the matrix to nested containers.
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

interface WidgetSpec {
  label: string;
  code: string;
}

const WIDGETS: WidgetSpec[] = [
  { label: 'Text block', code: 'text_block' },
  { label: 'Separator', code: 'separator' },
  { label: 'Coupon block', code: 'coupon_block' },
  { label: 'Announcement bar', code: 'announcement_bar' },
  { label: 'Banner', code: 'banner' }
];

const GLOBAL_AREAS = ['headerTop', 'content'] as const;

interface PlacementRow {
  route: string;
  area: string;
  sort_order: number;
  widget_instance_uuid: string;
}

async function readLatestPlacement(
  changesetId: string
): Promise<PlacementRow> {
  const db = getDb();
  const { rows } = await db.query<PlacementRow>(
    `SELECT (new_payload->>'route') AS route,
            (new_payload->>'area') AS area,
            (new_payload->>'sort_order')::int AS sort_order,
            (new_payload->>'widget_instance_uuid') AS widget_instance_uuid
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
       AND new_payload IS NOT NULL
     ORDER BY change_order DESC LIMIT 1`,
    [changesetId]
  );
  if (rows.length === 0) {
    throw new Error('No placement op found in changeset.');
  }
  return rows[0];
}

test.describe('drag-drop / matrix', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  for (const widget of WIDGETS) {
    for (const areaId of GLOBAL_AREAS) {
      test(`drop ${widget.label} into ${areaId} → widget+placement ops, route='all'`, async ({
        page
      }) => {
        const editor = new EditorPage(page);
        const palette = new PaletteTab(page);
        await editor.open('homepage');

        await palette.dragToArea(widget.label, widget.code, areaId);

        const changesetId = await getActiveChangesetId(loadAdminUserId());
        expect(changesetId).not.toBeNull();
        // Two ops minimum: widget_instance + widget_placement.
        await expect
          .poll(() => countOperations(changesetId!))
          .toBeGreaterThanOrEqual(2);

        const placement = await readLatestPlacement(changesetId!);
        expect(placement.area).toBe(areaId);
        expect(placement.route).toBe('all');
        expect(Number.isFinite(placement.sort_order)).toBe(true);
      });
    }
  }

  // sort_order math: a second drop into the same empty area lands above
  // the first via `computeDropSortOrder` (returns first child's
  // sort_order - 100 = 0 when only one child exists). Independent of
  // widget type — uses Text block as a representative.
  test('two drops into same area: second placement sorts above first', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    const palette = new PaletteTab(page);
    await editor.open('homepage');

    await palette.dragToArea('Text block', 'text_block', 'content');
    // Wait for first drop's placement to settle before the second drop —
    // `computeDropSortOrder` reads from the DOM, so the first widget
    // must be rendered for the second sort_order calculation.
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    await expect
      .poll(() => countOperations(changesetId!))
      .toBeGreaterThanOrEqual(2);

    await palette.dragToArea('Separator', 'separator', 'content');

    await expect
      .poll(() => countOperations(changesetId!))
      .toBeGreaterThanOrEqual(4);

    const db = getDb();
    const { rows } = await db.query<{
      sort_order: number;
      widget_uuid: string;
    }>(
      `SELECT (new_payload->>'sort_order')::int AS sort_order,
              (new_payload->>'widget_instance_uuid') AS widget_uuid
       FROM changeset_operation
       WHERE changeset_id = $1
         AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
         AND new_payload IS NOT NULL
       ORDER BY change_order ASC`,
      [changesetId]
    );
    expect(rows).toHaveLength(2);
    // The second placement should have a *lower* sort_order than the
    // first (it dropped above), per AreaStartDropZone's "drop-at-start"
    // semantics.
    expect(rows[1].sort_order).toBeLessThan(rows[0].sort_order);
  });
});
