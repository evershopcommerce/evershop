import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { getRoutes } from '../../../../../lib/router/Router.js';
import { getActiveTheme } from '../../../../../lib/util/getActiveTheme.js';
import { NOT_FOUND } from '../../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { EvershopResponse } from '../../../../../types/response.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getOrCreateDraftChangeset } from '../../../services/getOrCreateDraftChangeset.js';

export default async (request: EvershopRequest, response: EvershopResponse) => {
  const routeId = request.params.routeId;
  const targetRoute = getRoutes().find(
    (r: any) =>
      r.id === routeId && !r.isApi && !r.isAdmin && r.editable === true
  );
  if (!targetRoute) {
    response.status(NOT_FOUND);
    response.$body = { message: `Route '${routeId}' is not editable` };
    return;
  }

  const userId = (request as any).locals?.user?.admin_user_id;
  if (!userId) {
    // Auth middleware ought to have rejected already; defensive.
    response.status(401);
    return;
  }

  // The theme the editor operates under — captured once from config and
  // threaded into draft creation so the draft is tagged for (and isolated
  // to) the currently-active theme (spec 04 § 9.5, sticky-theme contract).
  const activeTheme = getActiveTheme();

  // Two session modes (spec § 5.7 + § 5.9.3):
  //   - Default: load the user's draft changeset (one per user).
  //   - Rollout edit: `?session=<rollout-uuid>` opens that rollout plan's
  //     underlying changeset for editing. The user gets the same editor,
  //     but the topbar surfaces it as "Rollout: <name>" and the publish
  //     button becomes "Save plan changes".
  const sessionParam =
    typeof request.query?.session === 'string' && request.query.session.length > 0
      ? String(request.query.session)
      : null;

  let changeset: any;
  let rolloutContext: {
    rolloutPlanId: number;
    uuid: string;
    name: string;
    startTime: Date | null;
    endTime: Date | null;
  } | null = null;

  if (sessionParam) {
    const plan = await select()
      .from('rollout_plan')
      .where('uuid', '=', sessionParam)
      .load(pool);
    if (!plan) {
      // Bad session uuid — fall back to draft so the user isn't blocked.
      // The picker can be reopened to choose a valid plan.
      changeset = await getOrCreateDraftChangeset({ userId, theme: activeTheme });
    } else {
      const planChangeset = await select()
        .from('changeset')
        .where('changeset_id', '=', (plan as any).changeset_id)
        .load(pool);
      if (!planChangeset || (planChangeset as any).published_at) {
        // Rollout's underlying changeset is gone or published — defensive
        // fall-back to draft. Published rollouts shouldn't be editable.
        changeset = await getOrCreateDraftChangeset({ userId, theme: activeTheme });
      } else {
        changeset = planChangeset;
        rolloutContext = {
          rolloutPlanId: (plan as any).rollout_plan_id,
          uuid: (plan as any).uuid,
          name: (plan as any).name,
          startTime: (plan as any).start_time ?? null,
          endTime: (plan as any).end_time ?? null
        };
      }
    }
  } else {
    changeset = await getOrCreateDraftChangeset({ userId, theme: activeTheme });
  }

  setPageMetaInfo(request, {
    title: `Edit ${(targetRoute as any).name}`,
    description: `Page builder editing route ${routeId}`
  });

  setContextValue(request, 'pageBuilderRouteId', routeId);
  setContextValue(request, 'pageBuilderRouteName', (targetRoute as any).name);
  setContextValue(request, 'pageBuilderRoutePath', (targetRoute as any).path);
  setContextValue(request, 'pageBuilderChangesetId', changeset.changeset_id);
  // String version for `url(..., params: [{key:"id", value: ...}])` — UrlParam.value is `String!`.
  setContextValue(
    request,
    'pageBuilderChangesetIdString',
    String(changeset.changeset_id)
  );
  setContextValue(request, 'pageBuilderChangesetUuid', changeset.uuid);
  setContextValue(request, 'pageBuilderChangesetToken', changeset.token);
  // Rollout-plan-id string for URL building. Set to "0" in draft mode — the
  // resulting sync/cancel/update URLs are never invoked there (the Editor
  // gates them on `changeset.rolloutPlan != null`), but the GraphQL query
  // can't conditionalize so we need a stable placeholder.
  setContextValue(
    request,
    'pageBuilderRolloutPlanIdString',
    String(rolloutContext?.rolloutPlanId ?? 0)
  );
  // The Editor reads `Changeset.rolloutPlan` via GraphQL to detect rollout-
  // edit mode; `rolloutContext` above is captured locally only as a defensive
  // validation that the rollout exists and points at an unpublished changeset
  // before we pin the editor to it.
};
