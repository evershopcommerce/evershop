import { createHash } from 'crypto';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';
import { info } from '../../../../lib/log/logger.js';
import { getConnection, pool } from '../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../lib/router/buildUrl.js';
import { PromotionUrn } from '../../../../lib/urn/index.js';
import { getEntityScope } from '../../../../lib/util/entityScopeRegistry.js';
import { getActiveTheme } from '../../../../lib/util/getActiveTheme.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import { getValue } from '../../../../lib/util/registry.js';
import { getEnabledWidgets } from '../../../../lib/widget/widgetManager.js';
import { assertUrlKeyAvailable } from '../../../base/services/assertUrlKeyAvailable.js';
import { getStoreTimezone } from '../../../setting/services/setting.js';
import {
  buildBackupIdentity,
  HOMEPAGE_BACKUP_URL_KEY_PREFIX
} from './backupIdentity.js';
import { cloneWidgetBody } from './cloneWidgetBody.js';
import {
  insertLandingPageData,
  validateLandingPageDataBeforeInsert
} from './createLandingPage.js';
import { findFreeUrlKey } from './findFreeUrlKey.js';
import { normalizeLandingPageData } from './normalizeLandingPageData.js';
import {
  cancelPlans,
  discardOperationsTouching,
  findChangesetsTouching,
  findRolloutPlansTouching,
  type ChangesetTouching,
  type RolloutPlanRef,
  type TargetSpec
} from './pageBuilderOps.js';
import { syncLandingPageUrlRewrite } from './syncLandingPageUrlRewrite.js';

/**
 * "Replace homepage with this page". Snapshot the current homepage widgets
 * into a new disabled backup landing page, then clone the chosen landing
 * page's body onto route `homepage`. One transaction, fail-fast on contention,
 * conditional on the state the preflight described.
 * Spec: specifications/replace-homepage-with-landing-page.md §3.
 */

export type ReplaceHomepageErrorCode =
  | 'LANDING_PAGE_NOT_FOUND'
  | 'HOMEPAGE_ROLLOUT_ACTIVE'
  | 'HOMEPAGE_CHANGED'
  | 'HOMEPAGE_ENTITY_SCOPED'
  | 'REPLACE_IN_PROGRESS';

export class ReplaceHomepageError extends Error {
  readonly status: number;

  readonly code: ReplaceHomepageErrorCode;

  readonly rolloutPlans?: RolloutPlanSummary[];

  constructor(
    code: ReplaceHomepageErrorCode,
    status: number,
    message: string,
    rolloutPlans?: RolloutPlanSummary[]
  ) {
    super(message);
    this.name = 'ReplaceHomepageError';
    this.code = code;
    this.status = status;
    this.rolloutPlans = rolloutPlans;
  }
}

export interface RolloutPlanSummary {
  uuid: string;
  name: string;
  startTime: string;
  endTime: string | null;
  status: 'active' | 'upcoming' | 'past';
  editUrl: string;
}

export const ADVISORY_LOCK_KEY = 'evershop:replace-homepage';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Order-independent fingerprint of a set of uuids. Pure. */
export function fingerprint(uuids: readonly string[]): string {
  return createHash('sha256')
    .update([...uuids].map((u) => u.toLowerCase()).sort().join('\n'))
    .digest('hex');
}

export function isLandingPageLive(lp: {
  status: boolean;
  publish_start?: Date | string | null;
  publish_end?: Date | string | null;
}): boolean {
  if (lp.status !== true) return false;
  const now = Date.now();
  if (lp.publish_start && new Date(lp.publish_start).getTime() > now) return false;
  if (lp.publish_end && new Date(lp.publish_end).getTime() <= now) return false;
  return true;
}

function planSummary(p: RolloutPlanRef, status: 'active' | 'upcoming' | 'past'): RolloutPlanSummary {
  return {
    uuid: p.uuid,
    name: p.name,
    startTime: new Date(p.start_time).toISOString(),
    endTime: p.end_time === null ? null : new Date(p.end_time).toISOString(),
    status,
    editUrl: `${buildUrl('pageBuilderEdit', { routeId: 'homepage' })}?session=${encodeURIComponent(p.uuid)}`
  };
}

interface HomepageRow {
  widget_placement_id: number;
  uuid: string;
  widget_instance_id: number;
  instance_uuid: string;
  area: string;
}

async function loadHomepageRows(
  q: PoolClient | typeof pool,
  theme: string | null,
  lock: boolean
): Promise<HomepageRow[]> {
  const res = await q.query<HomepageRow>(
    `SELECT p.widget_placement_id, p.uuid::text AS uuid, p.widget_instance_id,
            wi.uuid::text AS instance_uuid, p.area
       FROM widget_placement p
       INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
      WHERE p.route = 'homepage' AND p.entity_urn IS NULL AND p.theme IS NOT DISTINCT FROM $1
      ORDER BY p.widget_placement_id${lock ? ' FOR UPDATE OF p' : ''}`,
    [theme]
  );
  return res.rows;
}

async function hasEntityScopedHomepageRows(
  q: PoolClient | typeof pool,
  theme: string | null
): Promise<boolean> {
  const res = await q.query(
    `SELECT 1 FROM widget_placement
      WHERE route = 'homepage' AND entity_urn IS NOT NULL AND theme IS NOT DISTINCT FROM $1 LIMIT 1`,
    [theme]
  );
  return (res.rowCount ?? 0) > 0;
}

function homepageSpec(rows: HomepageRow[]): TargetSpec {
  return {
    route: 'homepage',
    entityUrn: null,
    placementUuids: rows.map((r) => r.uuid),
    instanceUuids: [...new Set(rows.map((r) => r.instance_uuid))]
  };
}

interface BodyRow {
  uuid: string;
  instance_uuid: string;
  area: string;
  status: boolean | null;
  type: string;
  settings_text: string;
}

async function loadBodyRows(
  q: PoolClient | typeof pool,
  urn: string,
  theme: string | null
): Promise<BodyRow[]> {
  const res = await q.query<BodyRow>(
    `SELECT p.uuid::text AS uuid, wi.uuid::text AS instance_uuid, p.area, wi.status, wi.type,
            COALESCE(wi.settings::text, '') AS settings_text
       FROM widget_placement p
       INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
      WHERE p.route = 'landingPageView' AND p.entity_urn = $1 AND p.theme IS NOT DISTINCT FROM $2
      ORDER BY p.widget_placement_id`,
    [urn, theme]
  );
  return res.rows;
}

/** Instances in the homepage set that have BOTH a `content` and a `landing_page_content` row (spec P14). */
function collidingInstanceIds(rows: HomepageRow[]): Set<number> {
  const byInstance = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!byInstance.has(r.widget_instance_id)) byInstance.set(r.widget_instance_id, new Set());
    byInstance.get(r.widget_instance_id)!.add(r.area);
  }
  const out = new Set<number>();
  for (const [id, areas] of byInstance) {
    if (areas.has('content') && areas.has('landing_page_content')) out.add(id);
  }
  return out;
}

const CHILD_AREA = /^columnsContainer_([0-9a-fA-F-]{36})_col_\d+$/;

/** Rows in `landing_page_content`/other areas that would actually render: status true, type registered, parent present for children. Pure. */
export function countRenderable(body: BodyRow[], enabledTypes: Set<string>): number {
  const instanceUuids = new Set(body.map((b) => b.instance_uuid.toLowerCase()));
  let n = 0;
  for (const b of body) {
    if (b.area === 'content') continue;
    if (b.status === false) continue;
    if (!enabledTypes.has(b.type)) continue;
    const m = CHILD_AREA.exec(b.area);
    if (m && !instanceUuids.has(m[1].toLowerCase())) continue;
    n += 1;
  }
  return n;
}

export interface PreflightResult {
  landingPage: {
    uuid: string;
    name: string;
    status: boolean;
    publishStart: string | null;
    publishEnd: string | null;
    isLive: boolean;
    bodyPlacementCount: number;
    renderablePlacementCount: number;
    hiddenPlacementCount: number;
    sharedRouteLevelCount: number;
    selfLinkCount: number;
    unpublishedOperationCount: number;
    rolloutPlans: RolloutPlanSummary[];
  };
  homepage: { placementCount: number; allRouteContentCount: number };
  /** `willCreate` is always true (kept for shape stability); `name` is the backup's name before suffixing. */
  backup: { willCreate: boolean; name: string };
  drafts: {
    operationCount: number;
    byCurrentAdmin: number;
    otherAdminCount: number;
    detachedRolloutOperationCount: number;
  };
  pastPlansToCancel: RolloutPlanSummary[];
  blockers: { rolloutPlans: RolloutPlanSummary[]; entityScopedHomepage: boolean };
  fingerprints: { homepage: string; landingPage: string };
  backupsTotal: number;
  warnings: string[];
}

async function countBackups(q: PoolClient | typeof pool): Promise<number> {
  const res = await q.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM landing_page WHERE url_key LIKE $1`,
    [`${HOMEPAGE_BACKUP_URL_KEY_PREFIX}%`]
  );
  return Number(res.rows[0]?.n ?? 0);
}

export async function preflightReplaceHomepage(
  uuid: string,
  userId: number
): Promise<PreflightResult> {
  if (!isUuid(uuid)) {
    throw new ReplaceHomepageError('LANDING_PAGE_NOT_FOUND', 404, 'Landing page not found');
  }
  const lpRes = await pool.query(`SELECT * FROM landing_page WHERE uuid = $1`, [uuid]);
  const lp = lpRes.rows[0];
  if (!lp) {
    throw new ReplaceHomepageError('LANDING_PAGE_NOT_FOUND', 404, 'Landing page not found');
  }
  const theme = getActiveTheme();
  const urnA = PromotionUrn.landingPage(lp.uuid);
  const now = new Date();

  const homepageRows = await loadHomepageRows(pool, theme, false);
  const spec = homepageSpec(homepageRows);
  const entityScopedHomepage =
    !!getEntityScope('homepage') || (await hasEntityScopedHomepageRows(pool, theme));

  const allRouteContent = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM widget_placement
      WHERE route = 'all' AND entity_urn IS NULL AND area = 'content' AND theme IS NOT DISTINCT FROM $1`,
    [theme]
  );

  const body = await loadBodyRows(pool, urnA, theme);
  const enabledTypes = new Set(getEnabledWidgets().map((w) => w.type));
  const hidden = body.filter((b) => b.area === 'content');
  const shared = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM widget_placement
      WHERE route = 'landingPageView' AND entity_urn IS NULL AND theme IS NOT DISTINCT FROM $1`,
    [theme]
  );
  const selfLinks = new Set(
    body.filter((b) => b.settings_text.includes(urnA)).map((b) => b.instance_uuid)
  ).size;

  const aSpec: TargetSpec = {
    route: null,
    entityUrn: urnA,
    placementUuids: body.map((b) => b.uuid),
    instanceUuids: [...new Set(body.map((b) => b.instance_uuid))]
  };
  const aChangesets = await findChangesetsTouching(pool, theme, aSpec);
  const aPlans = await findRolloutPlansTouching(pool, theme, aSpec, now);

  const changesets = await findChangesetsTouching(pool, theme, spec);
  const plans = await findRolloutPlansTouching(pool, theme, spec, now);

  const drafts = changesets.filter((c) => c.kind === 'draft');
  const detached = changesets.filter((c) => c.kind === 'detachedRollout');
  const byCurrentAdmin = drafts
    .filter((c) => c.created_by === userId)
    .reduce((s, c) => s + c.operationCount, 0);
  const otherAdmins = new Set(
    drafts.filter((c) => c.created_by !== userId).map((c) => c.created_by)
  );

  // The backup is created on every replace, even for an empty homepage: it is
  // the restore point regardless of content (decided 2026-09-12).
  const backupName = buildBackupIdentity(now, getStoreTimezone(), lp.name).name;

  const bodyPlacementCount = body.length - hidden.length;
  const renderable = countRenderable(body, enabledTypes);
  const isLive = isLandingPageLive(lp);

  const warnings: string[] = [];
  if (renderable === 0) warnings.push('LANDING_PAGE_HAS_NO_BODY');
  if (!isLive) warnings.push('LANDING_PAGE_NOT_LIVE');
  const aOps = aChangesets.reduce((s, c) => s + c.operationCount, 0);
  if (aOps > 0) warnings.push('LANDING_PAGE_HAS_UNPUBLISHED_CHANGES');
  if (aPlans.active.length + aPlans.upcoming.length > 0) warnings.push('LANDING_PAGE_HAS_ROLLOUT');
  if (Number(shared.rows[0]?.n ?? 0) > 0) warnings.push('LANDING_PAGE_HAS_SHARED_ROUTE_LEVEL_WIDGETS');
  if (hidden.length > 0) warnings.push('LANDING_PAGE_HAS_HIDDEN_WIDGETS');
  if (selfLinks > 0) warnings.push('LANDING_PAGE_LINKS_TO_ITSELF');
  if (Number(allRouteContent.rows[0]?.n ?? 0) > 0) warnings.push('HOMEPAGE_HAS_ALL_ROUTE_CONTENT_WIDGETS');
  if (changesets.length > 0) warnings.push('DRAFTS_WILL_BE_DISCARDED');
  if (plans.past.length > 0) warnings.push('PAST_PLANS_WILL_BE_CANCELLED');

  return {
    landingPage: {
      uuid: lp.uuid,
      name: lp.name,
      status: lp.status === true,
      publishStart: lp.publish_start ? new Date(lp.publish_start).toISOString() : null,
      publishEnd: lp.publish_end ? new Date(lp.publish_end).toISOString() : null,
      isLive,
      bodyPlacementCount,
      renderablePlacementCount: renderable,
      hiddenPlacementCount: hidden.length,
      sharedRouteLevelCount: Number(shared.rows[0]?.n ?? 0),
      selfLinkCount: selfLinks,
      unpublishedOperationCount: aOps,
      rolloutPlans: [
        ...aPlans.active.map((p) => planSummary(p, 'active')),
        ...aPlans.upcoming.map((p) => planSummary(p, 'upcoming'))
      ]
    },
    homepage: {
      placementCount: homepageRows.length,
      allRouteContentCount: Number(allRouteContent.rows[0]?.n ?? 0)
    },
    backup: { willCreate: true, name: backupName },
    drafts: {
      operationCount: drafts.reduce((s, c) => s + c.operationCount, 0),
      byCurrentAdmin,
      otherAdminCount: otherAdmins.size,
      detachedRolloutOperationCount: detached.reduce((s, c) => s + c.operationCount, 0)
    },
    pastPlansToCancel: plans.past.map((p) => planSummary(p, 'past')),
    blockers: {
      rolloutPlans: [
        ...plans.active.map((p) => planSummary(p, 'active')),
        ...plans.upcoming.map((p) => planSummary(p, 'upcoming'))
      ],
      entityScopedHomepage
    },
    fingerprints: {
      homepage: fingerprint(homepageRows.map((r) => r.uuid)),
      landingPage: fingerprint(body.map((b) => b.uuid))
    },
    backupsTotal: await countBackups(pool),
    warnings
  };
}

export interface ReplaceHomepageContext {
  routeId?: string;
  userId: number;
  /** From preflight; execute refuses when the live state differs. */
  expectedFingerprints?: { homepage: string; landingPage: string };
}

export interface ReplaceHomepageResult {
  /** Always present: the backup is the restore point even when the homepage was empty. */
  backup: { uuid: string; name: string; editUrl: string };
  backedUpInstances: number;
  backedUpPlacements: number;
  deletedInstances: number;
  clonedInstances: number;
  clonedPlacements: number;
  discardedChangesets: Array<{
    changesetId: number;
    createdBy: number;
    kind: 'draft' | 'detachedRollout';
    operationsRemoved: number;
  }>;
  cancelledPastPlans: Array<{ uuid: string; name: string }>;
  backupsTotal: number;
}

async function findFreeName(conn: PoolClient, base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  for (;;) {
    const r = await conn.query('SELECT 1 FROM landing_page WHERE name = $1 LIMIT 1', [candidate]);
    if ((r.rowCount ?? 0) === 0) return candidate;
    n += 1;
    candidate = `${base} (${n})`;
  }
}

/** Create the disabled backup landing page through the create pipeline (processor, normalize, validate, url_key guard, insert hook, url_rewrite). */
async function createHomepageBackup(
  this: any,
  landingPage: { name: string },
  connection: PoolClient,
  context: ReplaceHomepageContext
): Promise<{ uuid: string; name: string; url_key: string }> {
  const identity = buildBackupIdentity(new Date(), getStoreTimezone(), landingPage.name);
  const urlKey = await findFreeUrlKey(
    async (candidate) => {
      const r = await connection.query('SELECT 1 FROM landing_page WHERE url_key = $1 LIMIT 1', [candidate]);
      return (r.rowCount ?? 0) > 0;
    },
    identity.urlKeyBase
  );
  const name = await findFreeName(connection, identity.name);
  const data = normalizeLandingPageData(
    await getValue('landingPageDataBeforeCreate', {
      status: false,
      name,
      url_key: urlKey,
      description: identity.description,
      meta_title: null,
      meta_description: null,
      publish_start: null,
      publish_end: null
    })
  );
  validateLandingPageDataBeforeInsert(data);
  await assertUrlKeyAvailable(connection, data.url_key, null, 'landing_page');
  const row = await hookable(insertLandingPageData, {
    ...context,
    connection,
    source: 'replaceHomepage'
  })(data, connection);
  await syncLandingPageUrlRewrite(connection, { uuid: row.uuid, url_key: data.url_key });
  return row;
}

/** Copy the homepage rows into the backup, remove them from the homepage, delete originals left unplaced. */
async function snapshotHomepage(
  this: any,
  rows: HomepageRow[],
  backupUrn: string,
  theme: string | null,
  connection: PoolClient
): Promise<{ instances: number; placements: number; deletedInstances: number }> {
  if (rows.length === 0) {
    // Empty homepage: the backup exists but has no body.
    return { instances: 0, placements: 0, deletedInstances: 0 };
  }
  const clone = await cloneWidgetBody(connection, {
    from: { route: 'homepage', entityUrn: null },
    to: { route: 'landingPageView', entityUrn: backupUrn },
    areaMap: { content: 'landing_page_content' },
    theme: 'active',
    activeTheme: theme,
    keepAreaForInstanceIds: collidingInstanceIds(rows)
  });
  await connection.query('DELETE FROM widget_placement WHERE widget_placement_id = ANY($1::int[])', [
    rows.map((r) => r.widget_placement_id)
  ]);
  const del = await connection.query(
    `DELETE FROM widget_instance wi
      WHERE wi.uuid = ANY($1::uuid[])
        AND NOT EXISTS (SELECT 1 FROM widget_placement p WHERE p.widget_instance_id = wi.widget_instance_id)`,
    [[...new Set(rows.map((r) => r.instance_uuid))]]
  );
  return {
    instances: clone.clonedInstances,
    placements: clone.clonedPlacements,
    deletedInstances: del.rowCount ?? 0
  };
}

export const replaceHomepageCore = async function replaceHomepage(
  uuid: string,
  context: ReplaceHomepageContext
): Promise<ReplaceHomepageResult> {
  if (!isUuid(uuid)) {
    throw new ReplaceHomepageError('LANDING_PAGE_NOT_FOUND', 404, 'Landing page not found');
  }
  const connection: PoolClient = await getConnection();
  await startTransaction(connection);
  try {
    // 1. Fail fast on contention; never pin a pool client behind a slow run.
    await connection.query(`SET LOCAL lock_timeout = '5s'`);
    await connection.query(`SET LOCAL statement_timeout = '30s'`);
    const lock = await connection.query<{ ok: boolean }>(
      'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS ok',
      [ADVISORY_LOCK_KEY]
    );
    if (!lock.rows[0]?.ok) {
      throw new ReplaceHomepageError(
        'REPLACE_IN_PROGRESS',
        409,
        'Another homepage replace is running. Try again in a moment.'
      );
    }

    // 2. The chosen page, locked.
    const lpRes = await connection.query('SELECT * FROM landing_page WHERE uuid = $1 FOR UPDATE', [uuid]);
    const lp = lpRes.rows[0];
    if (!lp) {
      throw new ReplaceHomepageError('LANDING_PAGE_NOT_FOUND', 404, 'Landing page not found');
    }
    if (getEntityScope('homepage')) {
      throw new ReplaceHomepageError(
        'HOMEPAGE_ENTITY_SCOPED',
        409,
        'The homepage route is entity-scoped; replacing it is not supported.'
      );
    }
    const theme = getActiveTheme();
    const urnA = PromotionUrn.landingPage(lp.uuid);
    const now = new Date();

    // 3. The homepage set, locked.
    const rows = await loadHomepageRows(connection, theme, true);
    if (await hasEntityScopedHomepageRows(connection, theme)) {
      throw new ReplaceHomepageError(
        'HOMEPAGE_ENTITY_SCOPED',
        409,
        'The homepage has entity-scoped widget placements; remove them in the page builder first.'
      );
    }
    const spec = homepageSpec(rows);

    // 4. Conditional on what the dialog described.
    const body = await loadBodyRows(connection, urnA, theme);
    if (context.expectedFingerprints) {
      const live = {
        homepage: fingerprint(rows.map((r) => r.uuid)),
        landingPage: fingerprint(body.map((b) => b.uuid))
      };
      if (
        live.homepage !== context.expectedFingerprints.homepage ||
        live.landingPage !== context.expectedFingerprints.landingPage
      ) {
        throw new ReplaceHomepageError(
          'HOMEPAGE_CHANGED',
          409,
          'The homepage or the landing page changed since the preview. Review and confirm again.'
        );
      }
    }

    // 5. Rollout plans: block on active/upcoming, cancel past.
    const plans = await findRolloutPlansTouching(connection, theme, spec, now);
    if (plans.active.length + plans.upcoming.length > 0) {
      throw new ReplaceHomepageError(
        'HOMEPAGE_ROLLOUT_ACTIVE',
        409,
        'Rollout plans change the homepage. Cancel them or wait until they end.',
        [
          ...plans.active.map((p) => planSummary(p, 'active')),
          ...plans.upcoming.map((p) => planSummary(p, 'upcoming'))
        ]
      );
    }
    await cancelPlans(connection, plans.past.map((p) => p.rollout_plan_id));

    // 6. Drafts and detached rollout changesets: discard the ops that touch the homepage.
    const touching: ChangesetTouching[] = await findChangesetsTouching(connection, theme, spec, true);
    const discardedChangesets: ReplaceHomepageResult['discardedChangesets'] = [];
    for (const cs of touching) {
      const removed = await discardOperationsTouching(connection, cs.changeset_id, spec);
      discardedChangesets.push({
        changesetId: cs.changeset_id,
        createdBy: cs.created_by,
        kind: cs.kind,
        operationsRemoved: removed
      });
    }

    // 7 + 8. Backup + snapshot — always, even when the homepage is empty: the
    // backup is the restore point regardless of content (decided 2026-09-12).
    const row = await hookable(createHomepageBackup, {
      ...context,
      connection,
      landingPage: lp
    })(lp, connection, context);
    const backupUrn = PromotionUrn.landingPage(row.uuid);
    const snap = await hookable(snapshotHomepage, {
      ...context,
      connection,
      landingPage: lp,
      backup: row
    })(rows, backupUrn, theme, connection);
    const backup: ReplaceHomepageResult['backup'] = {
      uuid: row.uuid,
      name: row.name,
      editUrl: buildUrl('landingPageEdit', { id: row.uuid })
    };

    // 9. Clone A's body onto the homepage.
    const clone = await hookable(cloneWidgetBody, {
      ...context,
      connection,
      landingPage: lp,
      backup
    })(connection, {
      from: { route: 'landingPageView', entityUrn: urnA },
      to: { route: 'homepage', entityUrn: null },
      areaMap: { landing_page_content: 'content' },
      excludeAreas: ['content'],
      theme: 'active',
      activeTheme: theme
    });

    // 10. Final re-check.
    const recheck = await findRolloutPlansTouching(connection, theme, spec, new Date());
    if (recheck.active.length + recheck.upcoming.length > 0) {
      throw new ReplaceHomepageError(
        'HOMEPAGE_ROLLOUT_ACTIVE',
        409,
        'A rollout plan for the homepage was created meanwhile.',
        [
          ...recheck.active.map((p) => planSummary(p, 'active')),
          ...recheck.upcoming.map((p) => planSummary(p, 'upcoming'))
        ]
      );
    }
    const count = await connection.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM widget_placement
        WHERE route = 'homepage' AND entity_urn IS NULL AND theme IS NOT DISTINCT FROM $1`,
      [theme]
    );
    if (Number(count.rows[0]?.n ?? 0) !== clone.clonedPlacements) {
      throw new ReplaceHomepageError(
        'HOMEPAGE_CHANGED',
        409,
        'The homepage changed while it was being replaced. Nothing was changed; try again.'
      );
    }

    // 11. Attribution.
    info(
      `replaceHomepage: admin ${context.userId} replaced the homepage with landing page ${lp.uuid}` +
        ` (backup ${backup.uuid}; backed up ${snap.placements} placements /` +
        ` ${snap.instances} instances; deleted ${snap.deletedInstances} originals;` +
        ` cloned ${clone.clonedPlacements} placements / ${clone.clonedInstances} instances;` +
        ` discarded ${JSON.stringify(discardedChangesets)}; cancelled past plans ${JSON.stringify(
          plans.past.map((p) => p.uuid)
        )})`
    );

    const backupsTotal = await countBackups(connection);
    await commit(connection);
    return {
      backup,
      backedUpInstances: snap.instances,
      backedUpPlacements: snap.placements,
      deletedInstances: snap.deletedInstances,
      clonedInstances: clone.clonedInstances,
      clonedPlacements: clone.clonedPlacements,
      discardedChangesets,
      cancelledPastPlans: plans.past.map((p) => ({ uuid: p.uuid, name: p.name })),
      backupsTotal
    };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
};

export async function replaceHomepage(
  uuid: string,
  context: ReplaceHomepageContext
): Promise<ReplaceHomepageResult> {
  if (!context || typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  return hookable(replaceHomepageCore, context)(uuid, context);
}

export default replaceHomepage;

export function hookBeforeReplaceHomepage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('replaceHomepage', callback, priority);
}
export function hookAfterReplaceHomepage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('replaceHomepage', callback, priority);
}
export function hookBeforeCreateHomepageBackup(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('createHomepageBackup', callback, priority);
}
export function hookAfterCreateHomepageBackup(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('createHomepageBackup', callback, priority);
}
export function hookBeforeSnapshotHomepage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookBefore('snapshotHomepage', callback, priority);
}
export function hookAfterSnapshotHomepage(
  callback: (...args: any[]) => void | Promise<void>,
  priority = 10
): void {
  hookAfter('snapshotHomepage', callback, priority);
}
