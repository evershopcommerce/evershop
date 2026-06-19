import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import {
  cleanupTestRolloutPlans,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import { insertRolloutPlanDirect, seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { RolloutDialogPage } from '../../pages/RolloutDialog.js';

/**
 * Rollout-plan flow. The dialog covers create + validation + overlap; the
 * time-window spec bypasses the UI and inserts a rollout directly so we
 * can drive a 10-15 second activation window through the storefront's
 * `loadActiveOps` query.
 *
 * Common pattern: each test sets up a fresh draft + seeded widget op so
 * we can confirm rollout creation actually associates with the user's
 * current changeset, not some stale fixture.
 *
 * Cleanup: `e2e-` rollout plans are swept by globalTeardown via
 * `cleanupTestRolloutPlans`. Individual tests also call it in `beforeEach`
 * so the overlap-detection test starts from a clean rollout table.
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

const farFuture = (hoursFromNow: number, minutesOffset = 0): Date =>
  new Date(Date.now() + hoursFromNow * 3600_000 + minutesOffset * 60_000);

/**
 * Pick a start time that is reliably past any existing rollout plan in the
 * dev DB. The author's own dev DB has plans up through "two days from now"
 * — 100 days out keeps these specs robust without us needing to clean up
 * non-`e2e-` rows the user might be actively using.
 */
const SAFE_FUTURE_DAYS = 100;
const safeWindowStart = (offsetDays = 0): Date =>
  farFuture((SAFE_FUTURE_DAYS + offsetDays) * 24);

test.describe('rollout / dialog', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
    await cleanupTestRolloutPlans();
  });

  test('"Save as rollout plan" menu item opens the dialog', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    const dialog = new RolloutDialogPage(page);
    await editor.open('homepage');

    await editor.publishMoreButton.click();
    const menuItem = page.getByRole('menuitem', {
      name: /Save as rollout plan/i
    });
    await expect(menuItem).toBeVisible();
    await menuItem.click();

    await dialog.waitForOpen();
    await expect(dialog.title).toContainText('Save as rollout plan');
    await expect(dialog.submitButton).toBeDisabled();
    await dialog.cancel();
  });

  test('validation: empty name + missing start surfaces correct badge', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    const dialog = new RolloutDialogPage(page);
    await editor.open('homepage');

    await editor.publishMoreButton.click();
    await page.getByRole('menuitem', { name: /Save as rollout plan/i }).click();
    await dialog.waitForOpen();

    // Submit disabled out of the gate (no name, no start).
    await expect(dialog.submitButton).toBeDisabled();

    // Fill a valid start far enough in the future to avoid any existing
    // rollout in the dev DB. With a clear window the badge should label
    // the only remaining error as "Missing name".
    await dialog.fill({ start: safeWindowStart() });
    await expect(dialog.statusBadge).toHaveText('Missing name');
    await expect(dialog.submitButton).toBeDisabled();

    await dialog.cancel();
  });

  test('validation: end time before start surfaces "Invalid window"', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    const dialog = new RolloutDialogPage(page);
    await editor.open('homepage');

    await editor.publishMoreButton.click();
    await page.getByRole('menuitem', { name: /Save as rollout plan/i }).click();
    await dialog.waitForOpen();

    await dialog.fill({
      name: 'e2e-bad-window',
      start: safeWindowStart(1), // start +1 day from base
      end: safeWindowStart(0) // end *before* start
    });
    await expect(dialog.statusBadge).toHaveText('Invalid window');
    await expect(dialog.submitButton).toBeDisabled();
    await dialog.cancel();
  });

  test('validation: overlap with existing rollout shows conflict badge + plan name', async ({
    page
  }) => {
    // Seed a real changeset+rollout that occupies a known future window.
    // The dialog reads existing plans via GraphQL on editor mount; we
    // create the rollout BEFORE opening the editor so it loads into
    // `existingPlans`.
    const adminUserId = loadAdminUserId();
    const db = getDb();
    // published_at = NOW() so this fixture changeset doesn't sit in the
    // `(admin, NULL-theme)` open-draft bucket — `idx_changeset_user_theme_open`
    // (added in v1.1.0) would otherwise collide with the admin's
    // `pb-draft-<id>` open draft on later editor.open() calls.
    const { rows } = await db.query<{ changeset_id: number }>(
      `INSERT INTO changeset (name, route_cursors, token, created_by, published_at)
       VALUES ($1, $2::jsonb, $3, $4, NOW()) RETURNING changeset_id`,
      [
        'e2e-existing-cs',
        JSON.stringify({}),
        randomUUID(),
        adminUserId
      ]
    );
    const csId = rows[0].changeset_id;
    const existingStart = farFuture(72);
    const existingEnd = farFuture(96);
    await insertRolloutPlanDirect({
      name: 'e2e-existing-plan',
      changesetId: csId,
      routeCursors: {},
      startTime: existingStart,
      endTime: existingEnd
    });

    const editor = new EditorPage(page);
    const dialog = new RolloutDialogPage(page);
    await editor.open('homepage');

    await editor.publishMoreButton.click();
    await page.getByRole('menuitem', { name: /Save as rollout plan/i }).click();
    await dialog.waitForOpen();

    // Pick a window that overlaps `e2e-existing-plan`'s active window.
    await dialog.fill({
      name: 'e2e-overlap-attempt',
      start: new Date(existingStart.getTime() + 60 * 60_000), // 1h into existing window
      end: new Date(existingEnd.getTime() + 60 * 60_000) // 1h past existing end
    });

    await expect(dialog.statusBadge).toContainText(
      'Conflicts with e2e-existing-plan'
    );
    await expect(dialog.overlapError).toContainText('e2e-existing-plan');
    await expect(dialog.submitButton).toBeDisabled();
    await dialog.cancel();
  });

  test('create succeeds → editor navigates to picker home', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const dialog = new RolloutDialogPage(page);
    await editor.open('homepage');

    // Seed an op so the changeset has something to schedule.
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'all',
      placementRoute: 'all',
      area: 'headerTop',
      widgetType: 'announcement_bar'
    });
    await page.reload();
    await editor.publishMoreButton.click();
    await page.getByRole('menuitem', { name: /Save as rollout plan/i }).click();
    await dialog.waitForOpen();

    const planName = `e2e-create-${Date.now()}`;
    await dialog.fill({
      name: planName,
      start: farFuture(120), // 5 days out
      end: farFuture(144)
    });
    await expect(dialog.statusBadge).toHaveText('Scheduled');
    await expect(dialog.submitButton).toBeEnabled();

    // Submit fires `POST /rollout-plans`, then `handleScheduleRollout`
    // redirects the editor back to pickerHomeUrl. That redirect lands on the
    // SAME `/edit/homepage` URL we're already on, so a `toHaveURL` check is a
    // no-op — it resolves instantly and can't gate the DB read below, letting
    // the SELECT race the still-in-flight create (flakily reading zero rows).
    // Wait on the actual POST response so the row is committed before we read.
    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/page-builder/rollout-plans') &&
          r.request().method() === 'POST'
      ),
      dialog.submitButton.click()
    ]);
    expect(createResp.status()).toBe(201);

    // Verify the rollout row landed in the DB with the right metadata.
    const db = getDb();
    const planRows = await db.query<{
      name: string;
      changeset_id: number;
    }>(
      `SELECT name, changeset_id FROM rollout_plan WHERE name = $1`,
      [planName]
    );
    expect(planRows.rows).toHaveLength(1);
    expect(planRows.rows[0].changeset_id).toBe(changesetId);
  });
});

test.describe('rollout / time window', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
    await cleanupTestRolloutPlans();
    // Also strip any widgets a previous run left in the source tables —
    // the rollout-overlay path uses the changeset-overlay, but a published
    // e2e widget would still land in the storefront HTML and confuse the
    // BEFORE assertions.
    const db = getDb();
    await db.query(`DELETE FROM widget_instance WHERE name LIKE 'e2e-%'`);
  });

  test('storefront overlay activates at start_time, not before', async ({
    request
  }) => {
    // 1. Create a changeset with a text_block op whose className is a
    //    unique-per-test marker. We assert on the marker (not a widget
    //    base class) because the user's dev DB has its own coupon_block /
    //    text_block widgets already published — a generic class name
    //    would race against pre-existing fixtures.
    const marker = `e2e-time-window-marker-${randomUUID()}`;
    const adminUserId = loadAdminUserId();
    const db = getDb();
    const { rows: csRows } = await db.query<{ changeset_id: number }>(
      `INSERT INTO changeset (name, route_cursors, token, created_by)
       VALUES ($1, $2::jsonb, $3, $4) RETURNING changeset_id`,
      [
        'e2e-time-window-cs',
        JSON.stringify({ all: 2 }),
        randomUUID(),
        adminUserId
      ]
    );
    const csId = csRows[0].changeset_id;
    await seedWidgetPlacement(request, {
      changesetId: csId,
      route: 'all',
      placementRoute: 'all',
      area: 'content',
      widgetType: 'text_block',
      widgetSettings: { className: marker, text: '[]' }
    });

    // 2. Pre-activation snapshot — storefront must NOT show the marker.
    //    The op exists but no rollout covers it.
    const beforeAny = await request.get('/');
    expect(beforeAny.ok()).toBe(true);
    expect(await beforeAny.text()).not.toContain(marker);

    // 3. Insert a rollout scheduled 10 seconds in the future, with cursors
    //    advanced to include both ops we just seeded.
    const start = new Date(Date.now() + 10_000);
    await insertRolloutPlanDirect({
      name: 'e2e-time-window-plan',
      changesetId: csId,
      routeCursors: { all: 2 },
      startTime: start,
      endTime: null
    });

    // 4. Storefront still must NOT show the marker — rollout hasn't started.
    const beforeStart = await request.get('/');
    expect(beforeStart.ok()).toBe(true);
    expect(await beforeStart.text()).not.toContain(marker);

    // 5. Wait past start_time + a small buffer. The loadActiveOps query
    //    uses `rp.start_time <= NOW()`, so any time past the start mark
    //    qualifies. 12 seconds total covers the 10-second offset above
    //    plus latency between the initial insert and the SSR request.
    const elapsed = Date.now() - (start.getTime() - 10_000);
    const remaining = Math.max(0, 12_000 - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    // 6. Now the storefront must include the marker — same overlay path
    //    that the publish flow uses.
    const afterStart = await request.get('/');
    expect(afterStart.ok()).toBe(true);
    expect(await afterStart.text()).toContain(marker);
  });

  test('storefront overlay deactivates at end_time', async ({ request }) => {
    // Closes the lifecycle: the activation case above proves
    // `rp.start_time <= NOW()` works; this proves the companion clause
    // `(rp.end_time IS NULL OR rp.end_time > NOW())`. Without it the
    // scheduler trust story is half-told — a rollout that activates but
    // never deactivates would corrupt the live storefront indefinitely.
    //
    // Wall-clock window:
    //   t0 + 0s   insert rollout (start = t0+6s, end = t0+14s)
    //   t0 + ~1s  probe → not yet (start gate)
    //   t0 + 9s   probe → marker visible (mid-window)
    //   t0 + 16s  probe → marker gone (past end gate)
    //
    // Total wait ≈ 16s. The marker is per-run unique so it can't false-
    // positive on pre-existing dev-DB content.
    const marker = `e2e-end-time-marker-${randomUUID()}`;
    const adminUserId = loadAdminUserId();
    const db = getDb();
    const { rows: csRows } = await db.query<{ changeset_id: number }>(
      `INSERT INTO changeset (name, route_cursors, token, created_by)
       VALUES ($1, $2::jsonb, $3, $4) RETURNING changeset_id`,
      [
        'e2e-end-time-cs',
        JSON.stringify({}),
        randomUUID(),
        adminUserId
      ]
    );
    const csId = csRows[0].changeset_id;
    await seedWidgetPlacement(request, {
      changesetId: csId,
      route: 'all',
      placementRoute: 'all',
      area: 'content',
      widgetType: 'text_block',
      widgetSettings: { className: marker, text: '[]' }
    });

    // Anchor the time math AFTER seeding so seedWidgetPlacement's
    // round-trips don't eat into the start_time budget. The rollout's
    // start_time is measured from this t0, not from the test's start.
    const t0 = Date.now();
    const startTime = new Date(t0 + 6_000);
    const endTime = new Date(t0 + 14_000);
    await insertRolloutPlanDirect({
      name: 'e2e-end-time-plan',
      changesetId: csId,
      routeCursors: { all: 2 },
      startTime,
      endTime
    });

    // Phase 1: pre-start — rollout exists but loadActiveOps's WHERE
    // start_time <= NOW() filters it out.
    const beforeStart = await request.get('/');
    expect(beforeStart.ok()).toBe(true);
    expect(await beforeStart.text()).not.toContain(marker);

    // Phase 2: mid-window — wait ~3s past start_time.
    await waitUntilWallClock(t0 + 9_000);
    const midWindow = await request.get('/');
    expect(midWindow.ok()).toBe(true);
    expect(await midWindow.text()).toContain(marker);

    // Phase 3: past end_time — wait ~2s past end_time.
    await waitUntilWallClock(t0 + 16_000);
    const afterEnd = await request.get('/');
    expect(afterEnd.ok()).toBe(true);
    expect(await afterEnd.text()).not.toContain(marker);
  });
});

/**
 * Sleep until wall-clock time reaches `targetMs`. No-op if we're already
 * past it. Used in the scheduler tests to step through start_time /
 * end_time gates with a consistent anchor — `setTimeout(fixedDelay)`
 * would compound HTTP RTT into our timing budget.
 */
async function waitUntilWallClock(targetMs: number): Promise<void> {
  const remaining = targetMs - Date.now();
  if (remaining <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, remaining));
}
