import type { APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Direct REST helpers for the page-builder API. Bypasses the editor UI
 * for specs that need a specific changeset state set up quickly (drop
 * fixtures, share-route tests, etc.). The actual UI drag is covered in
 * the dedicated drag-drop specs.
 *
 * All calls go through Playwright's `APIRequestContext` so they share
 * the test admin's session cookie (set up by globalSetup's storageState).
 */

export interface AddOperationBody {
  route: string;
  entity_urn: string;
  old_payload: Record<string, unknown> | null;
  new_payload: Record<string, unknown> | null;
  change_order: number;
}

export async function postChangesetOperation(
  request: APIRequestContext,
  changesetId: number,
  body: AddOperationBody
): Promise<void> {
  const url = `/api/page-builder/changesets/${changesetId}/operations`;
  const res = await request.post(url, {
    data: body,
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok()) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `addOperation failed (${res.status()}): ${text.substring(0, 400)}`
    );
  }
}

/**
 * Convenience: insert a widget_instance + widget_placement pair via two
 * changeset_operation rows. Returns the widget uuid + placement uuid so
 * callers can reference them in assertions.
 *
 * Naming convention: every widget the test suite creates uses `e2e-` as
 * its `name` prefix so the global cleanup can sweep them.
 */
export async function seedWidgetPlacement(
  request: APIRequestContext,
  params: {
    changesetId: number;
    route: string;
    placementRoute: string;
    area: string;
    widgetType: string;
    widgetSettings?: Record<string, unknown>;
    sortOrder?: number;
    startChangeOrder?: number;
  }
): Promise<{ widgetUuid: string; placementUuid: string }> {
  const widgetUuid = randomUUID();
  const placementUuid = randomUUID();
  const sortOrder = params.sortOrder ?? 100;
  const baseOrder = params.startChangeOrder ?? 1;

  await postChangesetOperation(request, params.changesetId, {
    route: params.route,
    entity_urn: `urn:evershop:cms:widget_instance:${widgetUuid}`,
    old_payload: null,
    new_payload: {
      uuid: widgetUuid,
      type: params.widgetType,
      name: `e2e-${params.widgetType}`,
      settings: params.widgetSettings ?? {},
      status: true
    },
    change_order: baseOrder
  });
  await postChangesetOperation(request, params.changesetId, {
    route: params.route,
    entity_urn: `urn:evershop:cms:widget_placement:${placementUuid}`,
    old_payload: null,
    new_payload: {
      uuid: placementUuid,
      widget_instance_uuid: widgetUuid,
      route: params.placementRoute,
      area: params.area,
      sort_order: sortOrder,
      entity_urn: null
    },
    change_order: baseOrder + 1
  });
  return { widgetUuid, placementUuid };
}

/**
 * Insert a `rollout_plan` row directly via SQL.
 *
 * Bypasses the REST `createRolloutPlan` endpoint so we can:
 *   - Set `start_time` in the very near future (5–15s) without the dialog
 *     UI rounding to the minute.
 *   - Lock in `route_cursors` to a known value so the storefront overlay
 *     (`loadActiveOps`) picks up exactly the ops we expect.
 *
 * Naming convention: prefix the plan name with `e2e-` so global teardown
 * sweeps it via `cleanupTestRolloutPlans`.
 */
export async function insertRolloutPlanDirect(params: {
  name: string;
  changesetId: number;
  routeCursors: Record<string, number>;
  startTime: Date;
  endTime: Date | null;
  /**
   * Theme tag for the rollout. Defaults to NULL — Phase 1 tests that don't
   * care about theme isolation can omit this and inherit the NULL bucket
   * (which matches the test env's NULL active theme). Theme-isolation
   * tests pass an explicit value.
   */
  theme?: string | null;
}): Promise<{ rolloutPlanId: number }> {
  const db = getDb();
  const { rows } = await db.query<{ rollout_plan_id: number }>(
    `INSERT INTO rollout_plan
       (name, changeset_id, route_cursors, start_time, end_time, theme)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING rollout_plan_id`,
    [
      params.name,
      params.changesetId,
      JSON.stringify(params.routeCursors),
      params.startTime,
      params.endTime,
      params.theme ?? null
    ]
  );
  return { rolloutPlanId: rows[0].rollout_plan_id };
}
