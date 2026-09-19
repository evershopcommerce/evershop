import { expect, test } from '@playwright/test';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import { insertThemedChangeset } from '../../../shared/changesetDb.js';
import {
  cleanupTestRolloutPlans,
  discardAdminChangesets,
  getDb
} from '../../../shared/db.js';
import { insertRolloutPlanDirect } from '../../../shared/pbApi.js';

/**
 * Phase 2 — rollout theme inheritance + theme-scoped rollout listing
 * (spec 04 § 9.8, § 9.10). Far-future windows keep these clear of any other
 * rollout in the dev DB (the overlap check is theme-blind in v1).
 */
test.describe('theme / rollout', () => {
  const adminUserId = loadAdminUserId();
  const farFuture = (days: number) =>
    new Date(Date.now() + days * 24 * 3600_000);

  test.beforeEach(async () => {
    await discardAdminChangesets(adminUserId);
    await cleanupTestRolloutPlans();
  });

  test('createRolloutPlan inherits the changeset theme', async ({ request }) => {
    const { changesetId } = await insertThemedChangeset({
      adminUserId,
      theme: 'e2e-roll'
    });
    const planName = `e2e-roll-inherit-${Date.now()}`;
    const res = await request.post('/api/page-builder/rollout-plans', {
      data: {
        name: planName,
        changeset_id: changesetId,
        start_time: farFuture(300).toISOString(),
        end_time: farFuture(330).toISOString()
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.ok()).toBe(true);

    const db = getDb();
    const { rows } = await db.query<{ theme: string | null }>(
      `SELECT theme FROM rollout_plan WHERE name = $1`,
      [planName]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].theme).toBe('e2e-roll');
  });

  test('rolloutPlans GraphQL query is scoped to the active theme', async ({
    request
  }) => {
    // One rollout in the NULL bucket (active), one tagged for another theme.
    const nullCs = await insertThemedChangeset({ adminUserId, theme: null });
    const namedCs = await insertThemedChangeset({
      adminUserId,
      theme: 'hidden-theme'
    });
    const nullName = `e2e-rfilter-null-${Date.now()}`;
    const namedName = `e2e-rfilter-named-${Date.now()}`;
    await insertRolloutPlanDirect({
      name: nullName,
      changesetId: nullCs.changesetId,
      routeCursors: {},
      startTime: farFuture(300),
      endTime: farFuture(330),
      theme: null
    });
    await insertRolloutPlanDirect({
      name: namedName,
      changesetId: namedCs.changesetId,
      routeCursors: {},
      startTime: farFuture(300),
      endTime: farFuture(330),
      theme: 'hidden-theme'
    });

    const res = await request.post('/api/admin/graphql', {
      data: { query: '{ rolloutPlans { name } }' },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      data: { rolloutPlans: Array<{ name: string }> };
    };
    const names = body.data.rolloutPlans.map((r) => r.name);
    expect(names).toContain(nullName); // active (NULL) bucket → visible
    expect(names).not.toContain(namedName); // other theme → filtered out
  });
});
