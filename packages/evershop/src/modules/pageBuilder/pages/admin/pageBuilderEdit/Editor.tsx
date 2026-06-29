import { FileBrowser } from '@components/admin/FileBrowser.js';
import { Toaster, toast } from '@components/common/ui/Sonner.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  Layers,
  Monitor,
  PuzzleIcon,
  Redo2,
  Search,
  Smartphone,
  Tablet,
  Undo2
} from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useClient, useQuery } from 'urql';
import { v4 as uuidv4 } from 'uuid';
import { cursorsEqual } from '../../../components/cursorsEqual.js';
import {
  DeviceButton,
  type DeviceMode
} from '../../../components/DeviceButton.js';
import { LayerNode, type LayerWidget } from '../../../components/LayerNode.js';
import { LeftTabButton } from '../../../components/LeftTabButton.js';
import { PageSwitcher } from '../../../components/PageSwitcher.js';
import { PrimaryActionButton } from '../../../components/PrimaryActionButton.js';
import { SessionModeBadge } from '../../../components/SessionModeBadge.js';
import { getWidgetIcon } from '../../../components/widgetIcons.js';
import { WidgetPreviewCard } from '../../../components/WidgetPreviewCard.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { DiscardConfirmDialog } from './DiscardConfirmDialog.js';
import { ExitConfirmDialog } from './ExitConfirmDialog.js';
import { PublishDialog } from './PublishDialog.js';
import { RolloutDialog } from './RolloutDialog.js';
import { SessionPicker } from './SessionPicker.js';
import { SettingsDrawer } from './SettingsDrawer.js';

const CHANGESET_OPS_QUERY = `
  query ChangesetOps($id: Int!) {
    changeset(id: $id) {
      changesetId
      operations {
        entityUrn
        oldPayload
        newPayload
        route
      }
    }
  }
`;

const LAYERS_QUERY = `
  query LayersForRoute($route: String!, $changeset: String) {
    widgetsForRoute(route: $route, changeset: $changeset) {
      uuid
      name
      type
      rawSettings
      placements {
        uuid
        route
        area
        sortOrder
      }
      columns {
        index
        widgets {
          uuid
          name
          type
          rawSettings
          placements {
            uuid
            route
            area
            sortOrder
          }
        }
      }
    }
  }
`;

const PAGES_QUERY = `
  query Pages {
    routes {
      id
      name
      path
      isApi
      isAdmin
      editableInPageBuilder
    }
  }
`;

// Used by the SessionPicker (spec § 7.8) to surface upcoming + currently
// live rollout plans the user might want to resume editing. Past plans are
// filtered out client-side.
//
// `DateTime` is a GraphQL **type**, not a scalar (see
// modules/base/graphql/types/DateTime/DateTime.graphql), so we have to
// select a sub-field. `text(format: "...")` returns a luxon-formatted
// string the JS `Date` constructor can parse directly.
const ROLLOUT_PLANS_QUERY = `
  query RolloutPlans {
    rolloutPlans {
      rolloutPlanId
      uuid
      name
      startTime { text(format: "yyyy-LL-dd'T'HH:mm:ssZZ") }
      endTime { text(format: "yyyy-LL-dd'T'HH:mm:ssZZ") }
    }
  }
`;

type LeftTab = 'widgets' | 'pages' | 'layers';

const DEVICE_WIDTHS: Record<DeviceMode, string | null> = {
  desktop: null,
  tablet: '768px',
  phone: '375px'
};

interface WidgetType {
  code: string;
  name: string;
  description: string;
  category: string | null;
  /** Optional lucide icon name; resolved via `getWidgetIcon`. */
  icon: string | null;
  defaultSetting: Record<string, unknown> | null;
}

const WIDGET_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'content', label: _('Content') },
  { key: 'commerce', label: _('Commerce') },
  { key: 'navigation', label: _('Navigation') },
  { key: 'marketing', label: _('Marketing') },
  { key: 'layout', label: _('Layout') },
  { key: 'other', label: _('Other') }
];

interface RouteInfo {
  id: string;
  name: string;
  path: string;
  /**
   * Concrete URL the page-builder iframe loads. For static routes this
   * matches `path`; for routes with URL params (e.g. `/category/:uuid`)
   * the resolver substitutes a sample entity. May be null when the
   * backend has nothing to sample.
   */
  previewPath?: string | null;
}

interface ChangesetInfo {
  changesetId: number;
  uuid: string;
  token: string;
  /**
   * Per-route undo/redo cursors as a JSON object. Used to diff against
   * `rolloutPlan.routeCursors` for the Save-enabled state in rollout mode.
   */
  routeCursors: Record<string, number>;
  /**
   * Set when the user is editing a rollout plan's underlying changeset
   * (entered the editor via `?session=<rollout-uuid>` from SessionPicker).
   * Null when editing the user's draft. Drives the topbar SessionModeBadge
   * appearance and the publish-button-becomes-Save rename.
   */
  rolloutPlan?: {
    rolloutPlanId: number;
    uuid: string;
    name: string;
    /**
     * Snapshot of route_cursors at Save time. The live storefront overlay
     * filters by this; the editor diffs against `changeset.routeCursors`
     * to decide whether Save is enabled.
     */
    routeCursors: Record<string, number>;
    /** ISO 8601 string from luxon; nullable. Matches DateTime.text resolver. */
    startTime?: { text: string | null } | null;
    endTime?: { text: string | null } | null;
  } | null;
}

interface EditorProps {
  route: RouteInfo;
  changeset: ChangesetInfo;
  widgetTypes: WidgetType[];
  addOperationUrl: string;
  publishUrl: string;
  createRolloutPlanUrl: string;
  updateRolloutPlanUrl: string;
  syncRolloutPlanUrl: string;
  cancelRolloutPlanUrl: string;
  moveCurrentChangeUrl: string;
  discardChangesetUrl: string;
  pickerHomeUrl: string;
  dashboardUrl: string;
}

const PRIMARY_AREA = 'content';

interface SelectedWidget {
  uid: string;
  type: string;
  settings: Record<string, unknown>;
  /**
   * Optional seed for the SettingsDrawer's placement map. Set when the
   * widget is freshly inserted via drop: the placement only lives in the
   * changeset at that moment, not in the published `widget_placement`
   * table, so the drawer's `widgetByUuid` query (source-only) wouldn't
   * see it and would fall back to "current route only".
   */
  initialPlacements?: Array<{
    uuid: string;
    route: string;
    area: string;
    sortOrder: number;
  }>;
}

interface PendingParent {
  parentUid: string;
  columnIndex: number;
}

export default function Editor({
  route,
  changeset,
  widgetTypes,
  addOperationUrl,
  publishUrl,
  createRolloutPlanUrl,
  updateRolloutPlanUrl,
  syncRolloutPlanUrl,
  cancelRolloutPlanUrl,
  moveCurrentChangeUrl,
  discardChangesetUrl,
  pickerHomeUrl,
  dashboardUrl
}: EditorProps) {
  const [changeOrder, setChangeOrder] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(
    null
  );
  // Inline image editing — `EditableImage` in the canvas posts `edit-image`;
  // this holds the target widget + the settings fields to write once the
  // FileBrowser pick resolves.
  const [imageEdit, setImageEdit] = useState<{
    widgetUid: string;
    fields: { urlField: string; widthField?: string; heightField?: string };
  } | null>(null);
  // Tracks the most recently clicked Layers row so the panel can highlight
  // it visually. Independent from `selectedWidget` (which controls the
  // settings drawer) — clicking a layer no longer opens the drawer.
  const [layerHighlightedUid, setLayerHighlightedUid] = useState<string | null>(
    null
  );
  // Force-open the SessionPicker on demand (topbar SessionModeBadge click).
  // Decoupled from `sessionAcknowledged` so reopening after dismissal still
  // shows the picker. Closing via Cancel just flips this back to false.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingParent, setPendingParent] = useState<PendingParent | null>(
    null
  );
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isRolloutDialogOpen, setIsRolloutDialogOpen] = useState(false);
  // Widgets-palette hover preview state. Captures the hovered widget +
  // the row's bounding rect + the panel's right edge, so the preview card
  // can position itself just past the sidebar. Cleared on mouse-leave,
  // drag-start (don't shadow the drag image), and panel scroll (the
  // anchor would otherwise drift away from the row).
  const [hoverPreview, setHoverPreview] = useState<{
    widget: WidgetType;
    rect: DOMRect;
    anchorX: number;
  } | null>(null);
  const leftRailRef = useRef<HTMLElement | null>(null);
  // Schedule-editor dialog, opened by the SessionModeBadge pencil icon in
  // rollout-edit mode. Kept separate from the rollout-create dialog above so
  // the two flows don't share state machinery — the schedule editor uses
  // RolloutDialog in `editingPlan` mode and submits via PATCH; the create
  // dialog uses the same component without an editingPlan and submits via
  // POST. Two callbacks, two booleans, one dialog component reused.
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Page-level form (spec 03 § 2). Holds settings for every widget the
  // editor knows about, keyed `block.<uid>.settings.<field>`. Inline-edit
  // and the settings drawer both write through this form. `useWatch`
  // below produces per-uid auto-save ops.
  const pageForm = useForm({
    mode: 'onBlur',
    shouldUnregister: false,
    defaultValues: {
      block: {} as Record<string, { settings: Record<string, unknown> }>
    }
  });

  // Per-uid debounce timers and last-saved JSON snapshots. The watch
  // effect below diffs current form values against the snapshots and
  // schedules a save per widget that changed. Multiple field edits within
  // the debounce window collapse into one operation per widget.
  const saveTimersRef = useRef<Record<string, number>>({});
  const lastSavedSettingsRef = useRef<Record<string, string>>({});
  const initializedSeedsRef = useRef<Set<string>>(new Set());

  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('widgets');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [reloadCounter, setReloadCounter] = useState(0);
  const [widgetSearch, setWidgetSearch] = useState('');
  // Per demo: starts collapsed (52px). Click any tab icon expands to 260px.
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(true);
  const [globalsView, setGlobalsView] = useState(false);

  // Generic confirm-dialog state. Set the object to open the dialog; null
  // to close. The handler is stashed on the object so callers don't need
  // a separate state for each prompt.
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const runConfirm = useCallback(async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.onConfirm();
    } finally {
      setConfirmBusy(false);
      setConfirmState(null);
    }
  }, [confirmState]);

  // Mirror globals-view state to the iframe via postMessage. Iframe-side
  // PageBuilderBridge applies/removes the body dataset attribute that
  // drives the `[data-evershop-global]` outline styles.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow?.postMessage(
      { type: 'globals-view', enabled: globalsView },
      window.location.origin
    );
  }, [globalsView, reloadCounter]);

  // (drawer outside-click effect lives below the drawerPinned state
  // declaration — declaring drawerRef here for early access.)
  const drawerRef = useRef<HTMLElement | null>(null);

  // Drawer pin state — persisted to localStorage. Default unpinned per
  // spec § 7.5; click on canvas wrapper deselects when not pinned.
  const [drawerPinned, setDrawerPinned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('pb_drawer_pinned') === '1';
    } catch {
      return false;
    }
  });
  const toggleDrawerPin = useCallback(() => {
    setDrawerPinned((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('pb_drawer_pinned', next ? '1' : '0');
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Close the settings drawer when clicking anywhere outside it (topbar,
  // left rail, canvas padding). Drawer-internal clicks are ignored, and
  // pinned drawers stay open. Iframe clicks are routed through the
  // iframe's own bridge (`pb-canvas-click` / `widget-selected` messages),
  // so we deliberately skip clicks that land on the iframe element from
  // the parent's perspective — otherwise we'd race the iframe's own
  // selection handling and clear the just-selected widget.
  useEffect(() => {
    if (!selectedWidget || drawerPinned) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const drawer = drawerRef.current;
      if (drawer && target && drawer.contains(target)) return;
      // Iframe clicks: ignore — the iframe handles its own selection /
      // deselection through postMessage. Closing here would race with the
      // iframe's `widget-selected` message and either clobber it or
      // double-fire deselection.
      if (target?.tagName === 'IFRAME') return;
      // Skip closing when clicking inside an alert or dialog popup so the
      // confirm flow doesn't collapse the drawer state mid-confirm.
      if (target?.closest('[data-slot="alert-dialog-content"]')) return;
      if (target?.closest('[data-slot="dialog-content"]')) return;
      setSelectedWidget(null);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [selectedWidget, drawerPinned]);

  // Session picker (spec § 7.8). Show on first mount when the draft has
  // existing operations AND the user hasn't acknowledged this changeset
  // in this browser tab. Auto-skip otherwise.
  const sessionAckKey = `pb_session_ack_${changeset.changesetId}`;
  const [sessionAcknowledged, setSessionAcknowledged] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      try {
        return window.sessionStorage.getItem(sessionAckKey) === '1';
      } catch {
        return true;
      }
    }
  );
  const acknowledgeSession = useCallback(() => {
    setSessionAcknowledged(true);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(sessionAckKey, '1');
      }
    } catch {
      /* ignore */
    }
  }, [sessionAckKey]);

  // Landing via `?session=<rollout-uuid>` already represents an explicit
  // choice (the user clicked a rollout card in the SessionPicker, or
  // bookmarked the URL). Auto-acknowledge so the picker doesn't re-open on
  // the very next render — every reload otherwise looped back into the
  // same "Start a page-builder session" dialog. The SessionModeBadge
  // remains the manual escape hatch.
  useEffect(() => {
    if (changeset.rolloutPlan != null && !sessionAcknowledged) {
      acknowledgeSession();
    }
  }, [changeset.rolloutPlan, sessionAcknowledged, acknowledgeSession]);

  // Pull the changeset's operations *before* the exit-confirm hooks below
  // so their dependency arrays can reference `operations.length` without
  // tripping TDZ — JS evaluates the deps array eagerly, even though the
  // effect body runs later.
  const [opsResult, refetchOps] = useQuery({
    query: CHANGESET_OPS_QUERY,
    variables: { id: changeset.changesetId },
    pause: true
  });
  const operations = (opsResult.data as any)?.changeset?.operations ?? [];
  // Set of route IDs that have any pending op in the current draft. Used
  // to mark "Draft" status pills on the Pages tab. Spec § 7.7.
  const routesWithDraftOps = useMemo(() => {
    const s = new Set<string>();
    for (const op of operations as Array<{ route?: string | null }>) {
      if (op?.route) s.add(op.route);
    }
    return s;
  }, [operations]);

  // Refetch ops once on mount so the session picker can decide whether
  // to surface (we need to know if the existing draft has any ops).
  useEffect(() => {
    refetchOps({ requestPolicy: 'network-only' });
  }, []);

  // Exit-confirm state. `pendingSavesCount` is incremented when an op
  // POST is in flight, decremented on response (success or fail).
  // `pendingExitUrl` holds the destination the user attempted to navigate
  // to while a save was in flight; the dialog resolves it.
  const [pendingSavesCount, setPendingSavesCount] = useState(0);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Suppresses the native `beforeunload` prompt for intentional redirects
  // — publish, schedule-rollout, ExitConfirmDialog's Leave button, and
  // in-editor anchor clicks. Without this, `operations.length > 0` is
  // still true at the moment of `window.location.href = …` (the GraphQL
  // cache hasn't refetched yet, or the changeset legitimately holds
  // unpublished ops that survive the route switch), so the browser shows
  // its "Leave site?" prompt right when the user already confirmed they
  // want to leave.
  const suppressBeforeUnloadRef = useRef(false);
  const markIntentionalNavigation = useCallback(() => {
    suppressBeforeUnloadRef.current = true;
    // Belt-and-braces reset: if the navigation doesn't actually happen
    // (e.g. a click handler later calls `preventDefault`, or the user
    // Ctrl+clicked and we mis-detected it as a normal click), drop the
    // flag so the next real exit attempt isn't silently allowed.
    window.setTimeout(() => {
      suppressBeforeUnloadRef.current = false;
    }, 500);
  }, []);

  // Browser-tab close — native `beforeunload` prompt when there are
  // outstanding saves OR unpublished operations. Custom UI isn't allowed
  // for this path; the native dialog is the platform's exit-confirm.
  useEffect(() => {
    if (pendingSavesCount === 0 && operations.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (suppressBeforeUnloadRef.current) return;
      e.preventDefault();
      // Required for some browsers; the actual string is ignored in modern browsers.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [pendingSavesCount, operations.length]);

  // Cover the plain-anchor case: PageSwitcher and the Pages-tab now use
  // `<a href={editPathForRoute(routeId)}>` to switch routes inside the
  // editor. Browser navigates without going through `requestNavigation`,
  // so we tag the click here (capture phase) and let the navigation
  // proceed silently.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        'a[href]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank') return;
      const href = anchor.getAttribute('href') ?? '';
      if (
        href === pickerHomeUrl ||
        href.startsWith(`${pickerHomeUrl}/`) ||
        href.startsWith(`${pickerHomeUrl}?`)
      ) {
        markIntentionalNavigation();
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [pickerHomeUrl, markIntentionalNavigation]);

  // Helper for in-app navigation that may need to confirm.
  //
  // Confirm only when LEAVING the page-builder editor — the changeset is
  // per-user (one draft spans every route the user edits), so route
  // switching inside the editor preserves all unpublished work and the
  // dialog would be noise. Logo/back links to the dashboard and any
  // future leave-editor sites still go through the dialog.
  //
  // Two reasons to open it for leave-editor targets:
  //   - In-flight saves: typing that hasn't reached the server yet.
  //   - Saved-but-unpublished operations: the merchandiser usually wants
  //     the "Save as rollout plan" affordance before walking away.
  const requestNavigation = useCallback(
    (url: string) => {
      const stayingInEditor =
        typeof url === 'string' &&
        (url === pickerHomeUrl ||
          url.startsWith(`${pickerHomeUrl}/`) ||
          url.startsWith(`${pickerHomeUrl}?`));
      if (stayingInEditor) {
        markIntentionalNavigation();
        window.location.href = url;
        return;
      }
      if (pendingSavesCount > 0 || operations.length > 0) {
        setPendingExitUrl(url);
        return;
      }
      markIntentionalNavigation();
      window.location.href = url;
    },
    [
      pendingSavesCount,
      operations.length,
      pickerHomeUrl,
      markIntentionalNavigation
    ]
  );

  // Widgets palette: filter by search query (matches name + description),
  // then bucket by category. Spec § 7.7. While targeting a column we hide
  // layout-category widgets so the merchandiser can't nest containers.
  const groupedWidgetTypes = useMemo(() => {
    const q = widgetSearch.trim().toLowerCase();
    const filtered = widgetTypes.filter((wt) => {
      if (pendingParent && wt.code === 'columns') return false;
      if (!q) return true;
      // Match the localized label/description too, so search works in the admin language.
      const hay = `${_(wt.name)} ${wt.description ? _(wt.description) : ''} ${
        wt.code
      }`.toLowerCase();
      return hay.includes(q);
    });
    const buckets = new Map<string, WidgetType[]>();
    for (const wt of filtered) {
      const key = (wt.category ?? 'other').toLowerCase();
      const known = WIDGET_CATEGORIES.some((c) => c.key === key);
      const bucketKey = known ? key : 'other';
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey)!.push(wt);
    }
    return WIDGET_CATEGORIES.map((c) => ({
      ...c,
      widgets: buckets.get(c.key) ?? []
    })).filter((g) => g.widgets.length > 0);
  }, [widgetTypes, widgetSearch, pendingParent]);

  // Lookup map for the Layers panel: widget code → registry entry. Lets
  // LayerNode render the canonical widget name + description rather than the
  // per-instance name + raw type code.
  const widgetTypesByCode = useMemo(() => {
    const map = new Map<string, WidgetType>();
    for (const wt of widgetTypes) map.set(wt.code, wt);
    return map;
  }, [widgetTypes]);

  const client = useClient();
  const [layersResult, refetchLayers] = useQuery({
    query: LAYERS_QUERY,
    // Pass the changeset token so the resolver applies this draft's overlay
    // before grouping/filtering — Layers stays in sync with what the iframe
    // actually renders (palette adds, deletes, moves, inline-edits all
    // reflect immediately instead of only after publish).
    variables: { route: route.id, changeset: changeset.token },
    pause: true
  });
  const rawLayerWidgets = (layersResult.data as any)?.widgetsForRoute ?? [];

  // Iframe DOM order — populated by `preview-rendered` postMessages from
  // PageBuilderBridge after each iframe render. Layers tab sorts widgets
  // by this so the panel matches what the storefront actually paints
  // (Area positioning + per-area sort_order combined). Falls back to the
  // server's MIN(sort_order) ordering until the first message lands.
  const [iframeWidgetOrder, setIframeWidgetOrder] = useState<string[]>([]);
  const layerWidgets = useMemo(() => {
    if (iframeWidgetOrder.length === 0) return rawLayerWidgets;
    const indexMap = new Map<string, number>();
    iframeWidgetOrder.forEach((uid, i) => indexMap.set(uid, i));
    const sortByDom = <T extends { uuid?: string }>(arr: T[]): T[] =>
      [...arr].sort((a, b) => {
        const ai = indexMap.get(a.uuid ?? '') ?? Number.MAX_SAFE_INTEGER;
        const bi = indexMap.get(b.uuid ?? '') ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    // Sort top-level widgets AND each container's column children — both
    // appear in the iframe's flat `[data-evershop-pb-widget-uid]` query so
    // the index map covers everything.
    return sortByDom(rawLayerWidgets).map((w: any) => {
      if (!Array.isArray(w?.columns)) return w;
      return {
        ...w,
        columns: w.columns.map((col: any) => ({
          ...col,
          widgets: Array.isArray(col?.widgets) ? sortByDom(col.widgets) : []
        }))
      };
    });
  }, [rawLayerWidgets, iframeWidgetOrder]);

  // Seed pageForm with settings for every widget known on the route
  // (top-level + nested container children) so field components inside
  // <WidgetSettingsScope> hydrate from real values. Re-runs whenever
  // layerWidgets changes (e.g. after reload triggered by undo/redo or
  // initial mount). Does NOT overwrite values the user is currently
  // editing — it only fills in missing entries.
  useEffect(() => {
    if (!Array.isArray(layerWidgets) || layerWidgets.length === 0) return;
    const current = pageForm.getValues('block') ?? {};
    const next: Record<string, { settings: Record<string, unknown> }> = {
      ...(current as any)
    };
    const visit = (w: any) => {
      if (!w?.uuid) return;
      if (!next[w.uuid]) {
        next[w.uuid] = {
          settings: (w.rawSettings as Record<string, unknown>) ?? {}
        };
      }
      if (Array.isArray(w.columns)) {
        for (const col of w.columns) {
          if (Array.isArray(col?.widgets)) col.widgets.forEach(visit);
        }
      }
    };
    layerWidgets.forEach(visit);
    pageForm.setValue('block', next, {
      shouldDirty: false,
      shouldTouch: false
    });
  }, [layerWidgets, pageForm]);

  // Seed-on-selection: when a widget is selected, ensure its settings are
  // populated in the form via a *reset* (not setValue). RHF's setValue does
  // NOT sync useFieldArray-driven subcomponents — slide arrays, menu items,
  // etc. only read from defaultValues at mount or from useFieldArray's
  // replace(). reset() re-initializes everything, so field arrays pick up
  // the seeded values.
  //
  // `keepDirtyValues` preserves any in-progress edits the user has touched
  // on other widgets; only non-dirty fields take the new values.
  useEffect(() => {
    if (!selectedWidget) return;
    const current = pageForm.getValues() as {
      block?: Record<string, { settings: Record<string, unknown> }>;
    };
    const existing = current?.block?.[selectedWidget.uid]?.settings;
    const hasExisting = existing && Object.keys(existing).length > 0;
    if (hasExisting) return;
    const nextBlock = {
      ...(current.block ?? {}),
      [selectedWidget.uid]: { settings: { ...(selectedWidget.settings ?? {}) } }
    };
    // Snapshot the new settings so the auto-save effect doesn't see this
    // seed as a user edit and emit a spurious save op.
    initializedSeedsRef.current.add(selectedWidget.uid);
    lastSavedSettingsRef.current[selectedWidget.uid] = JSON.stringify(
      selectedWidget.settings ?? {}
    );
    pageForm.reset(
      { ...(current as any), block: nextBlock },
      { keepDirtyValues: true, keepTouched: true, keepErrors: true }
    );
  }, [selectedWidget?.uid]);

  const [pagesResult] = useQuery({ query: PAGES_QUERY });
  const allRoutes = (pagesResult.data as any)?.routes ?? [];

  // Rollout plans for the SessionPicker. Filter out past plans (already
  // ended) so the picker only surfaces things the user might still want
  // to act on. `startTime` / `endTime` are GraphQL DateTime objects with
  // a `text` sub-field; flatten to ISO strings for the picker.
  const [rolloutPlansResult] = useQuery({ query: ROLLOUT_PLANS_QUERY });
  const upcomingAndLiveRolloutPlans = useMemo(() => {
    const plans = (rolloutPlansResult.data as any)?.rolloutPlans ?? [];
    const now = Date.now();
    type Mapped = {
      rolloutPlanId: number;
      uuid: string;
      name: string;
      startTime: string | null;
      endTime: string | null;
    };
    type WithStart = Mapped & { startTime: string };
    return (
      (plans as Array<any>)
        .map(
          (p): Mapped => ({
            rolloutPlanId: p.rolloutPlanId,
            uuid: p.uuid,
            name: p.name,
            startTime: (p.startTime?.text as string | null) ?? null,
            endTime: (p.endTime?.text as string | null) ?? null
          })
        )
        // Type predicate so the downstream chain (and consumers like
        // RolloutDialog / SessionPicker) see `startTime: string`, not
        // `string | null`.
        .filter((p): p is WithStart => p.startTime != null)
        .filter((p) => {
          if (!p.endTime) return true; // indefinite — still actionable
          return new Date(p.endTime).getTime() > now;
        })
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
    );
  }, [rolloutPlansResult.data]);
  const pageRoutes = useMemo(
    () =>
      allRoutes
        .filter(
          (r: any) =>
            r.editableInPageBuilder === true &&
            !r.isApi &&
            !r.isAdmin &&
            typeof r.path === 'string'
        )
        // Homepage first, then alphabetical by display name. The raw `routes`
        // query returns scan/registration order, which reads as random in the
        // switcher and Pages tab; a stable, predictable order is friendlier.
        // `.filter` already returned a fresh array, so sorting in place is safe.
        .sort((a: any, b: any) => {
          if (a.id === b.id) return 0;
          if (a.id === 'homepage') return -1;
          if (b.id === 'homepage') return 1;
          return (a.name ?? '').localeCompare(b.name ?? '');
        }),
    [allRoutes]
  );

  // Refetch the layers list whenever the iframe reloads (i.e., after any
  // op was saved). The layers panel shows the changeset-overlayed source,
  // not the in-flight admin state, so this stays consistent with the iframe.
  useEffect(() => {
    // Layers data isn't only for the panel — move/duplicate handlers also
    // read from `layerWidgets` to find the target's placement uuid +
    // sort_order. Refetch on mount and after every preview-push so that
    // toolbar actions always operate on fresh state, even when the user
    // hasn't opened the Layers tab.
    refetchLayers({ requestPolicy: 'network-only' });
  }, [reloadCounter, refetchLayers]);

  // For dynamic routes (e.g. `/category/:uuid`) the resolver substitutes a
  // sample entity so the iframe can actually load. Static routes return
  // their declared `path`.
  const previewablePath = route.previewPath || route.path;

  const iframeSrc = useMemo(() => {
    const sep = previewablePath.includes('?') ? '&' : '?';
    return `${previewablePath}${sep}changeset=${encodeURIComponent(
      changeset.token
    )}`;
  }, [previewablePath, changeset.token]);

  /**
   * Build an editor URL for a route, preserving the current session. When
   * the user is editing a rollout plan, route-switch links must carry
   * `?session=<rollout-uuid>` so the next page-handler invocation pins the
   * editor to the same rollout's changeset (spec § 5.7: one session spans
   * every route the user touches). Centralized so future navigation sites
   * can't accidentally drop the session.
   *
   * Sites that explicitly want to LEAVE rollout-edit mode ("Continue your
   * draft", "Start new changeset" in the SessionPicker) build their URL
   * inline with a bare `${pickerHomeUrl}/edit/<route>` — by design.
   */
  const editPathForRoute = useCallback(
    (routeId: string): string => {
      const base = `${pickerHomeUrl}/edit/${encodeURIComponent(routeId)}`;
      return changeset.rolloutPlan
        ? `${base}?session=${encodeURIComponent(changeset.rolloutPlan.uuid)}`
        : base;
    },
    [pickerHomeUrl, changeset.rolloutPlan]
  );

  // Monotonic preview-push counter; sent with each data-update message so
  // the iframe bridge can drop stale responses (race handling per spec
  // 03 § 7.3.4).
  const previewSequenceRef = useRef(0);

  // Cached overlay-applied widgets (uuid, areaId, sortOrder, placementUuid)
  // captured from the last `pushPreviewToIframe` fetch. The move/duplicate
  // handlers consult this so they see exactly what the iframe renders — the
  // GraphQL `widgetsForRoute` resolver reads source state only and would
  // produce visually-invisible reorders when prior ops have already shifted
  // sort_orders.
  const overlayWidgetsRef = useRef<
    Array<{
      uuid: string;
      type: string;
      areaId: string[];
      sortOrder: number;
      placementUuid?: string;
      settings?: Record<string, unknown>;
    }>
  >([]);

  const previewBaseUrl = useMemo(() => {
    const sep = previewablePath.includes('?') ? '&' : '?';
    return `${previewablePath}${sep}changeset=${encodeURIComponent(
      changeset.token
    )}&ajax=true`;
  }, [previewablePath, changeset.token]);

  /**
   * V2 server-side preview rendering. After any op is saved, fetch the
   * route's AJAX response (which runs the storefront pipeline with the
   * changeset overlay applied) and postMessage the resulting eContext to
   * the iframe. The iframe's `PageBuilderBridge` calls `setData` with the
   * new graphqlResponse / propsMap / widgets so React re-renders affected
   * widgets without reloading. This preserves contentEditable focus, scroll
   * position, and any in-progress UI state in the iframe.
   */
  const pushPreviewToIframe = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    // Flip the iframe's LoadingBar on immediately so the merchandiser sees
    // visible feedback during the ~200–500ms preview rebuild. The bridge
    // flips it off when the `data-update` message lands below.
    iframe.contentWindow.postMessage(
      { type: 'preview-start' },
      window.location.origin
    );
    try {
      const res = await fetch(previewBaseUrl, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        // The bridge owns the off-flip via data-update; on failure we have
        // to clear the bar manually or it'll stay stuck at peak. Bump the
        // sequence so the bridge accepts this empty data-update.
        previewSequenceRef.current += 1;
        iframe.contentWindow.postMessage(
          { type: 'data-update', sequence: previewSequenceRef.current },
          window.location.origin
        );
        return;
      }
      const json = await res.json();
      const eContext = json?.eContext;
      if (!eContext) return;
      // Cache overlay-applied widgets for move/duplicate handlers (see ref
      // declaration above).
      if (Array.isArray(eContext.widgets)) {
        overlayWidgetsRef.current = eContext.widgets;
      }
      previewSequenceRef.current += 1;
      iframe.contentWindow.postMessage(
        {
          type: 'data-update',
          graphqlResponse: eContext.graphqlResponse,
          propsMap: eContext.propsMap,
          widgets: eContext.widgets,
          sequence: previewSequenceRef.current
        },
        window.location.origin
      );
      setReloadCounter((n) => n + 1);
    } catch {
      // Best-effort; if preview push fails the user can still hit refresh.
      // Clear the LoadingBar so it doesn't stay pinned at peak.
      previewSequenceRef.current += 1;
      iframe.contentWindow?.postMessage(
        { type: 'data-update', sequence: previewSequenceRef.current },
        window.location.origin
      );
    }
  }, [previewBaseUrl]);

  // Prime `overlayWidgetsRef` once on mount (and whenever the route changes)
  // so the very first move/duplicate click works without first triggering an
  // unrelated pushPreviewToIframe. The iframe is already SSR-rendered with
  // the overlay applied; we just need the parent to know what's in there.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(previewBaseUrl, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const widgets = json?.eContext?.widgets;
        if (Array.isArray(widgets) && !cancelled) {
          overlayWidgetsRef.current = widgets;
        }
      } catch {
        // Best-effort prime; pushPreviewToIframe will refresh on next op.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewBaseUrl]);

  const nextChangeOrder = useCallback(() => {
    let next = 0;
    setChangeOrder((current) => {
      next = current + 1;
      return next;
    });
    return next;
  }, []);

  const postOperation = useCallback(
    async (op: {
      entity_urn: string;
      old_payload: Record<string, unknown> | null;
      new_payload: Record<string, unknown> | null;
    }) => {
      const order = nextChangeOrder();
      setPendingSavesCount((n) => n + 1);
      try {
        await axios.post(addOperationUrl, {
          ...op,
          route: route.id,
          change_order: order
        });
        setError(null);
        return true;
      } catch (e) {
        const msg =
          (e as any)?.response?.data?.error?.message ??
          (e as Error).message ??
          _('Failed to save change');
        setError(msg);
        return false;
      } finally {
        setPendingSavesCount((n) => Math.max(0, n - 1));
      }
    },
    [addOperationUrl, nextChangeOrder, route.id]
  );

  const handleAddWidget = useCallback(
    async (
      widgetType: WidgetType,
      opts?: {
        /**
         * Pre-computed sort_order for the new placement. The iframe owns
         * this math (see `computeDropSortOrder` and the drop-zone
         * components in `common/page-builder/`) because only the iframe
         * sees the full rendered ordering — widgets AND layout components
         * interleaved. When omitted (e.g. click-to-add in the legacy
         * palette flow), we fall back to a safe append at 100.
         */
        sortOrder?: number;
        /**
         * Override the target area. Defaults to `PRIMARY_AREA` ("content").
         * Used when the iframe's drop zone lives in a non-primary Area
         * (e.g. header, footer) so the placement lands where the user
         * actually dropped.
         */
        area?: string;
        /**
         * Set when the drop target was wrapped in `<Area isGlobal>` (header,
         * footer, etc.). Defaults the top-level placement to `route='all'`
         * so the widget shows on every page — matching how those slots
         * intuitively behave. Doesn't affect child widgets inside a
         * container; those follow their parent's existing route policy.
         */
        isGlobal?: boolean;
      }
    ) => {
      const widgetUuid = uuidv4();
      const widgetName = `${widgetType.name} (new)`;
      const initialSettings = (widgetType.defaultSetting ?? {}) as Record<
        string,
        unknown
      >;

      const nextSortOrder =
        typeof opts?.sortOrder === 'number' && !Number.isNaN(opts.sortOrder)
          ? opts.sortOrder
          : 100;
      const targetArea = opts?.area ?? PRIMARY_AREA;
      const targetRoute = opts?.isGlobal ? 'all' : route.id;

      // Is this a drop into a column container? The "+ Add to Column" flow sets
      // `pendingParent`; a drag-drop only carries the synthetic
      // `columnsContainer_<parentUid>_col_<index>` target area. Parse it so BOTH
      // paths run the child branch below — children ALWAYS follow their parent's
      // route, never `isGlobal` (which a child would otherwise inherit from a
      // surrounding global Area like `content`, wrongly forcing route='all').
      const columnAreaMatch = targetArea.match(
        /^columnsContainer_(.+)_col_(\d+)$/
      );
      const childContext =
        pendingParent ??
        (columnAreaMatch
          ? {
              parentUid: columnAreaMatch[1],
              columnIndex: Number(columnAreaMatch[2])
            }
          : null);

      if (childContext) {
        // Child widget — same shape as a top-level widget, but its placement
        // targets the parent's synthetic Area
        // `columnsContainer_<parentUid>_col_<index>`. The placement's route
        // follows the parent: if the parent has any 'all' placement, the
        // child rides along on every route; otherwise it sticks to the
        // route the user is currently editing.
        const parent = (layerWidgets as any[]).find(
          (w) => w?.uuid === childContext.parentUid
        );
        const parentRoutes: string[] = Array.isArray(parent?.placements)
          ? parent.placements
              .filter((p: any) => p && p.entity_urn == null)
              .map((p: any) => p.route)
          : [];
        const childRoute = parentRoutes.includes('all') ? 'all' : route.id;
        const childArea = `columnsContainer_${childContext.parentUid}_col_${childContext.columnIndex}`;
        // Sort within the column: a high default that leaves room for
        // pre-existing children; the visible reorder logic in moveWidget
        // displaces past the neighbor's sort_order anyway.
        const siblingCount =
          parent && Array.isArray(parent.columns)
            ? parent.columns.find(
                (c: any) => c.index === childContext.columnIndex
              )?.widgets?.length ?? 0
            : 0;
        // A drag carries an iframe-computed drop position; click-to-add (the
        // "+ Add to Column" flow) has none, so it appends past existing children.
        const childSortOrder =
          typeof opts?.sortOrder === 'number' && !Number.isNaN(opts.sortOrder)
            ? opts.sortOrder
            : 100 + siblingCount;

        const placementUuid = uuidv4();
        const widgetOk = await postOperation({
          entity_urn: `urn:evershop:cms:widget_instance:${widgetUuid}`,
          old_payload: null,
          new_payload: {
            uuid: widgetUuid,
            type: widgetType.code,
            name: widgetName,
            settings: initialSettings,
            status: true
          }
        });
        if (!widgetOk) return;

        const placementOk = await postOperation({
          entity_urn: `urn:evershop:cms:widget_placement:${placementUuid}`,
          old_payload: null,
          new_payload: {
            uuid: placementUuid,
            widget_instance_uuid: widgetUuid,
            route: childRoute,
            area: childArea,
            sort_order: childSortOrder,
            entity_urn: null
          }
        });
        if (!placementOk) return;

        setPendingParent(null);
        setSelectedWidget({
          uid: widgetUuid,
          type: widgetType.code,
          settings: initialSettings
        });
        await pushPreviewToIframe();
        return;
      }

      // Top-level widget: INSERT widget_instance + INSERT widget_placement.
      const placementUuid = uuidv4();
      const widgetOk = await postOperation({
        entity_urn: `urn:evershop:cms:widget_instance:${widgetUuid}`,
        old_payload: null,
        new_payload: {
          uuid: widgetUuid,
          type: widgetType.code,
          name: widgetName,
          settings: initialSettings,
          status: true
        }
      });
      if (!widgetOk) return;

      const placementOk = await postOperation({
        entity_urn: `urn:evershop:cms:widget_placement:${placementUuid}`,
        old_payload: null,
        new_payload: {
          uuid: placementUuid,
          widget_instance_uuid: widgetUuid,
          route: targetRoute,
          area: targetArea,
          sort_order: nextSortOrder,
          entity_urn: null
        }
      });
      if (!placementOk) return;

      setSelectedWidget({
        uid: widgetUuid,
        type: widgetType.code,
        settings: initialSettings,
        // Seed the drawer with the placement we just inserted so the
        // share dropdown immediately reflects route='all' (global drops)
        // or the current route, without waiting for an iframe refresh
        // or a `widgetByUuid` requery.
        initialPlacements: [
          {
            uuid: placementUuid,
            route: targetRoute,
            area: targetArea,
            sortOrder: nextSortOrder
          }
        ]
      });
      pushPreviewToIframe();
    },
    // `layerWidgets` still consumed by the pendingParent branch (parent lookup
    // + child placement context). Top-level drops no longer read it — they
    // use the iframe-computed sortOrder in `opts`.
    [postOperation, pushPreviewToIframe, route.id, pendingParent, layerWidgets]
  );

  const openPublishDialog = useCallback(() => {
    refetchOps({ requestPolicy: 'network-only' });
    setIsPublishDialogOpen(true);
  }, [refetchOps]);

  // Per-route undo/redo state. The buttons disable when there's nothing to
  // undo (cursor already at 0 for this route) or redo (no ops past the
  // cursor on this route). The server is the source of truth; we read
  // canUndo/canRedo from GraphQL and the move-current endpoint's response.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Local mirrors of the cursor maps so the editor can react to mutations
  // without a full page reload. `editorCursors` advances on every op /
  // undo / redo / discard; `savedCursors` only moves when the user clicks
  // Save (sync). In draft mode `savedCursors` stays at `{}` and the Save
  // button isn't rendered anyway.
  const [editorCursors, setEditorCursors] = useState<Record<string, number>>(
    () => changeset.routeCursors ?? {}
  );
  const [savedCursors, setSavedCursors] = useState<Record<string, number>>(
    () => changeset.rolloutPlan?.routeCursors ?? {}
  );

  const refreshUndoRedoState = useCallback(async () => {
    try {
      const sub = await client
        .query(
          `query UndoRedoState($id: Int!, $route: String!) {
             changeset(id: $id) {
               canUndo(route: $route)
               canRedo(route: $route)
               routeCursors
               rolloutPlan {
                 routeCursors
               }
             }
           }`,
          { id: changeset.changesetId, route: route.id },
          { requestPolicy: 'network-only' }
        )
        .toPromise();
      const cs = (sub?.data as any)?.changeset;
      if (cs) {
        setCanUndo(!!cs.canUndo);
        setCanRedo(!!cs.canRedo);
        if (cs.routeCursors) {
          setEditorCursors(cs.routeCursors);
        }
        if (cs.rolloutPlan?.routeCursors) {
          setSavedCursors(cs.rolloutPlan.routeCursors);
        }
      }
    } catch {
      // Best-effort; the buttons stay in their last known state.
    }
  }, [client, changeset.changesetId, route.id]);

  const hasUnsavedRolloutChanges = useMemo(
    () => !cursorsEqual(editorCursors, savedCursors),
    [editorCursors, savedCursors]
  );

  // Refresh on mount, on route switch, and whenever an op gets persisted
  // (signalled via reloadCounter, which bumps after each pushPreviewToIframe).
  useEffect(() => {
    void refreshUndoRedoState();
  }, [refreshUndoRedoState, reloadCounter]);

  const handleMoveCurrent = useCallback(
    async (direction: 'undo' | 'redo') => {
      try {
        const res = await axios.post(moveCurrentChangeUrl, {
          direction,
          route: route.id
        });
        // The endpoint returns the post-move canUndo/canRedo for this route
        // — apply immediately so the buttons don't flash to a stale state
        // before the GraphQL refetch lands.
        const payload = res?.data?.data;
        if (payload) {
          if (typeof payload.canUndo === 'boolean') setCanUndo(payload.canUndo);
          if (typeof payload.canRedo === 'boolean') setCanRedo(payload.canRedo);
        }
        await pushPreviewToIframe();
      } catch (e) {
        const msg =
          (e as any)?.response?.data?.error?.message ??
          (e as Error).message ??
          _('${direction} failed', { direction });
        setError(msg);
      }
    },
    [moveCurrentChangeUrl, pushPreviewToIframe, route.id]
  );

  // Discard dialog (spec § 7.8): the user picks between full and per-route
  // discard. Op counts come from GraphQL on each open so they reflect the
  // current state (pending in-flight ops will already be persisted to
  // `changeset_operation` by the time the dialog renders — auto-save fires
  // before the discard button is clickable).
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardBusy, setDiscardBusy] = useState(false);
  const [discardCounts, setDiscardCounts] = useState<{
    total: number;
    currentRoute: number;
    breakdown: Array<{ route: string; count: number }>;
  }>({ total: 0, currentRoute: 0, breakdown: [] });

  const handleDiscard = useCallback(async () => {
    // Fetch fresh counts before opening so the per-route label is accurate.
    try {
      const sub = await client
        .query(
          `query DiscardCounts($id: Int!, $route: String!) {
             changeset(id: $id) {
               operationCountForRoute(route: $route)
               operationCountsByRoute { route count }
             }
           }`,
          { id: changeset.changesetId, route: route.id },
          { requestPolicy: 'network-only' }
        )
        .toPromise();
      const cs = (sub?.data as any)?.changeset;
      const breakdown: Array<{ route: string; count: number }> =
        cs?.operationCountsByRoute ?? [];
      const total = breakdown.reduce(
        (sum: number, r: { count: number }) => sum + (r.count ?? 0),
        0
      );
      setDiscardCounts({
        total,
        currentRoute: Number(cs?.operationCountForRoute ?? 0),
        breakdown
      });
    } catch {
      // Best-effort; show zeros if the fetch fails.
      setDiscardCounts({ total: 0, currentRoute: 0, breakdown: [] });
    }
    setDiscardDialogOpen(true);
  }, [client, changeset.changesetId, route.id]);

  const performDiscard = useCallback(
    async (mode: 'all' | 'route') => {
      setDiscardBusy(true);
      try {
        const url =
          mode === 'route'
            ? `${discardChangesetUrl}?route=${encodeURIComponent(route.id)}`
            : discardChangesetUrl;
        const res = await axios.post(url);
        const changesetDeleted = res?.data?.data?.changesetDeleted !== false;
        if (changesetDeleted) {
          // Full discard, or the route-scoped path emptied the changeset —
          // either way, navigate back so the picker can mint a fresh one.
          markIntentionalNavigation();
          window.location.href = `${pickerHomeUrl}/edit/${encodeURIComponent(
            route.id
          )}`;
          return;
        }
        // Per-route discard with surviving ops on other routes: keep the
        // session alive, refresh the iframe + undo/redo state.
        setDiscardDialogOpen(false);
        setDiscardBusy(false);
        await pushPreviewToIframe();
        await refreshUndoRedoState();
      } catch (e) {
        const msg =
          (e as any)?.response?.data?.error?.message ??
          (e as Error).message ??
          _('Discard failed');
        setError(msg);
        setDiscardBusy(false);
      }
    },
    [
      discardChangesetUrl,
      pickerHomeUrl,
      route.id,
      pushPreviewToIframe,
      refreshUndoRedoState
    ]
  );

  const handlePublish = useCallback(async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      const opCount = operations.length;
      await axios.post(publishUrl);
      setError(null);
      // Persist the success message across the redirect so the next page's
      // mount (a fresh editor on the same route, since the picker just
      // bounces to the first editable route) can flash a Sonner toast. Was
      // previously a silent reload that landed straight on the session
      // picker, leaving the merchandiser unsure whether the publish
      // succeeded.
      try {
        sessionStorage.setItem(
          'pb_publish_flash',
          opCount === 1
            ? _('1 change published.')
            : _('${count} changes published.', { count: String(opCount) })
        );
      } catch {
        // sessionStorage can throw in private modes; non-fatal.
      }
      markIntentionalNavigation();
      window.location.href = pickerHomeUrl;
    } catch (e) {
      const msg =
        (e as any)?.response?.data?.error?.message ??
        (e as Error).message ??
        _('Publish failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsPublishing(false);
    }
  }, [
    publishUrl,
    pickerHomeUrl,
    isPublishing,
    operations.length,
    markIntentionalNavigation
  ]);

  // Flash the publish-success toast after the post-publish reload lands on
  // a fresh editor instance. sessionStorage is consumed on read.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let flash: string | null = null;
    try {
      flash = sessionStorage.getItem('pb_publish_flash');
      if (flash) sessionStorage.removeItem('pb_publish_flash');
    } catch {
      return;
    }
    if (flash) toast.success(flash);
  }, []);

  const handleScheduleRollout = useCallback(
    async (plan: {
      name: string;
      startTime: string;
      endTime: string | null;
    }) => {
      if (isPublishing) return;
      setIsPublishing(true);
      try {
        await axios.post(createRolloutPlanUrl, {
          name: plan.name,
          changeset_id: changeset.changesetId,
          start_time: plan.startTime,
          end_time: plan.endTime
        });
        setError(null);
        // If the rollout was triggered from the exit-confirm flow's
        // "Save as rollout plan and leave" option, honor the original
        // navigation target. Otherwise navigate to the picker home — the
        // user typically wants to start a fresh session or revisit other
        // rollouts after scheduling.
        const dest = pendingExitUrl ?? pickerHomeUrl;
        setPendingExitUrl(null);
        markIntentionalNavigation();
        window.location.href = dest;
      } catch (e) {
        const msg =
          (e as any)?.response?.data?.error?.message ??
          (e as Error).message ??
          _('Schedule failed');
        setError(msg);
      } finally {
        setIsPublishing(false);
      }
    },
    [
      createRolloutPlanUrl,
      pickerHomeUrl,
      changeset.changesetId,
      isPublishing,
      pendingExitUrl,
      markIntentionalNavigation
    ]
  );

  // Save action for rollout-edit mode. Copies the editor's current
  // route_cursors snapshot into the rollout plan so the live storefront
  // catches up. User stays in the editor; state refreshes via
  // refreshUndoRedoState so the Save button reflects the new "no changes
  // to save" state.
  const handleSyncRollout = useCallback(async () => {
    if (isSyncing || !changeset.rolloutPlan) return;
    setIsSyncing(true);
    try {
      await axios.post(syncRolloutPlanUrl);
      setError(null);
      await refreshUndoRedoState();
    } catch (e) {
      const msg =
        (e as any)?.response?.data?.error?.message ??
        (e as Error).message ??
        _('Save failed');
      setError(msg);
    } finally {
      setIsSyncing(false);
    }
  }, [
    syncRolloutPlanUrl,
    isSyncing,
    changeset.rolloutPlan,
    refreshUndoRedoState
  ]);

  // Cancel-rollout-plan flow. Opens the generic ConfirmDialog so the
  // destructive action requires an explicit second click. On confirm we
  // DELETE the rollout (the underlying changeset is preserved per
  // cancelRolloutPlan's docstring) and navigate the user to picker home —
  // their pb-draft is untouched there, so a fresh editing session can
  // start cleanly.
  const handleCancelRolloutPlan = useCallback(() => {
    if (!changeset.rolloutPlan) return;
    const planName = changeset.rolloutPlan.name;
    setConfirmState({
      title: _('Cancel rollout plan?'),
      description: (
        <>
          {_('The rollout plan')} <strong>{planName}</strong>{' '}
          {_(
            'will be removed and the live storefront will stop applying its edits. The underlying changeset and its pending content edits are preserved.'
          )}
        </>
      ),
      confirmLabel: _('Cancel rollout'),
      destructive: true,
      onConfirm: async () => {
        await axios.delete(cancelRolloutPlanUrl);
        markIntentionalNavigation();
        window.location.href = pickerHomeUrl;
      }
    });
  }, [
    cancelRolloutPlanUrl,
    pickerHomeUrl,
    changeset.rolloutPlan,
    markIntentionalNavigation,
    setConfirmState
  ]);

  // Schedule editor submit. PATCHes the rollout's name/start/end and closes
  // the dialog on success. Refreshes via reload because the rollout name
  // shown in SessionModeBadge comes from the props (SSR query) — easier
  // than threading the updated values back through props.
  const handleUpdateRolloutSchedule = useCallback(
    async (plan: {
      name: string;
      startTime: string;
      endTime: string | null;
    }) => {
      if (!changeset.rolloutPlan || isUpdatingSchedule) return;
      setIsUpdatingSchedule(true);
      try {
        await axios.patch(updateRolloutPlanUrl, {
          name: plan.name,
          start_time: plan.startTime,
          end_time: plan.endTime
        });
        setError(null);
        setIsScheduleEditorOpen(false);
        window.location.reload();
      } catch (e) {
        const msg =
          (e as any)?.response?.data?.error?.message ??
          (e as Error).message ??
          _('Failed to update rollout schedule');
        setError(msg);
        setIsUpdatingSchedule(false);
      }
    },
    [updateRolloutPlanUrl, changeset.rolloutPlan, isUpdatingSchedule]
  );

  // Persist a UPDATE op for a widget's full new settings, then reload the
  // iframe so the canvas reflects the new state.
  const saveWidgetSettings = useCallback(
    async (uid: string, newSettings: Record<string, unknown>) => {
      await postOperation({
        entity_urn: `urn:evershop:cms:widget_instance:${uid}`,
        old_payload: { settings: '__previous__' },
        new_payload: { settings: newSettings }
      });
      // Update the local selectedWidget so the drawer keeps a stable view
      // of the latest settings if the user re-opens it for the same widget.
      setSelectedWidget((prev) =>
        prev && prev.uid === uid ? { ...prev, settings: newSettings } : prev
      );
      pushPreviewToIframe();
    },
    [postOperation, pushPreviewToIframe]
  );

  // Page-level auto-save (spec § 7.3.2). Watch the entire `block` subtree
  // of the form. On any change, diff current per-uid settings against the
  // last saved snapshot. For each uid that changed, schedule a 300ms
  // debounce (clearing any pending one) that saves the full new settings.
  // Multiple field edits within the window collapse into one op.
  const blockValues = useWatch({ control: pageForm.control, name: 'block' });
  useEffect(() => {
    const blocks =
      (blockValues as Record<string, { settings: Record<string, unknown> }>) ??
      {};
    for (const uid of Object.keys(blocks)) {
      const settings = blocks[uid]?.settings;
      if (!settings) continue;
      const stringified = JSON.stringify(settings);
      // First time we see a uid (form just got seeded with its values),
      // record the snapshot but don't save — saving now would emit
      // a no-op for every widget that already exists on the route.
      if (!initializedSeedsRef.current.has(uid)) {
        initializedSeedsRef.current.add(uid);
        lastSavedSettingsRef.current[uid] = stringified;
        continue;
      }
      if (lastSavedSettingsRef.current[uid] === stringified) continue;

      // Reset the debounce timer for this uid so rapid edits collapse.
      const existing = saveTimersRef.current[uid];
      if (existing) window.clearTimeout(existing);
      saveTimersRef.current[uid] = window.setTimeout(() => {
        lastSavedSettingsRef.current[uid] = stringified;
        delete saveTimersRef.current[uid];
        void saveWidgetSettings(uid, settings);
      }, 300);
    }
  }, [blockValues, saveWidgetSettings]);
  // Cleanup any pending debounces on unmount so a navigating-away tab
  // doesn't fire a save after we've left.
  useEffect(() => {
    return () => {
      for (const t of Object.values(saveTimersRef.current)) {
        window.clearTimeout(t);
      }
      saveTimersRef.current = {};
    };
  }, []);

  // Caller (drawer) generates the placement UUID so it can store it for a
  // later DELETE op if the user toggles the route off again. Otherwise an
  // ON → OFF → ON cycle would emit two INSERT ops for the same (widget,
  // route, area) and trip widget_placement's unique index on publish.
  //
  // `area` is the target slot — the drawer derives it from the widget's
  // existing placements so e.g. a `headerMiddleLeft` widget shared to
  // another route lands in `headerMiddleLeft` there too, not in `content`.
  //
  // `sortOrder` lets the drawer keep an existing placement's slot when
  // "swapping" a route (e.g. flipping `route='all'` → `route='homepage'`).
  // Matching sort_order means the storefront's cell dedupe
  // `(widget_instance_uuid, area, sort_order)` collapses the transient
  // `[old, new]` pair to one render — no flash during the add→remove gap.
  const addPlacement = useCallback(
    async (
      targetRouteId: string,
      placementUuid: string,
      area: string = PRIMARY_AREA,
      sortOrder: number = 100
    ) => {
      const ok = await postOperation({
        entity_urn: `urn:evershop:cms:widget_placement:${placementUuid}`,
        old_payload: null,
        new_payload: {
          uuid: placementUuid,
          widget_instance_uuid: selectedWidget?.uid,
          route: targetRouteId,
          area,
          sort_order: sortOrder,
          entity_urn: null
        }
      });
      if (ok) await pushPreviewToIframe();
    },
    [postOperation, pushPreviewToIframe, selectedWidget?.uid]
  );

  const removePlacement = useCallback(
    async (placementUuid: string) => {
      const ok = await postOperation({
        entity_urn: `urn:evershop:cms:widget_placement:${placementUuid}`,
        old_payload: { __delete: true },
        new_payload: null
      });
      if (ok) await pushPreviewToIframe();
    },
    [postOperation, pushPreviewToIframe]
  );

  // Flatten layerWidgets into a single list of (top-level + container
  // children). Children live in `layerWidgets[].columns[].widgets` and
  // each carries its own placements (synthetic columnsContainer_*).
  const flatLayerWidgets = useCallback((): any[] => {
    const out: any[] = [];
    for (const w of (layerWidgets as any[]) ?? []) {
      out.push(w);
      for (const col of (w?.columns as any[]) ?? []) {
        for (const child of (col?.widgets as any[]) ?? []) {
          out.push(child);
        }
      }
    }
    return out;
  }, [layerWidgets]);

  // Pick the placement on `area` that the current route renders. Prefer
  // a route-specific placement, fall back to a route='all' shared one.
  const placementInArea = useCallback(
    (placements: any[] | undefined, area: string) => {
      const ps = Array.isArray(placements) ? placements : [];
      return (
        ps.find((p) => p?.area === area && p?.route === route.id) ??
        ps.find((p) => p?.area === area && p?.route === 'all') ??
        null
      );
    },
    [route.id]
  );

  // Move a widget up or down within its area. The toolbar sends `area` so we
  // operate on the right placement when the widget has placements in
  // multiple areas (e.g. a basic_menu shared via 'all/headerMiddleLeft' but
  // also placed in 'cart/content'). Works uniformly for top-level widgets
  // and container children (children's siblings live in the same synthetic
  // `columnsContainer_<parent>_col_<i>` area).
  //
  // Reads from `overlayWidgetsRef` — the post-overlay widgets list captured
  // from the most recent storefront preview. The GraphQL `widgetsForRoute`
  // resolver reads source state only and would disagree with the iframe
  // after several reorders.
  //
  // Algorithm: swap the two placements' `sort_order` values via two UPDATE
  // ops. This gives an unambiguous reorder — the earlier `neighbor ± 1`
  // approach could collide with a third sibling already sitting at that
  // value, and stable-sort tie-breaking then depended on PostgreSQL row
  // iteration order, causing the moved widget to land in unexpected slots
  // (often the very first position).
  const moveWidget = useCallback(
    async (uid: string, area: string, direction: 'up' | 'down') => {
      const overlay = overlayWidgetsRef.current;
      const siblings = overlay
        .filter((w) => Array.isArray(w.areaId) && w.areaId.includes(area))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const idx = siblings.findIndex((w) => w.uuid === uid);
      if (idx < 0) return;
      const me = siblings[idx];
      if (!me.placementUuid) return;
      const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
      const neighbor = siblings[neighborIdx];
      if (!neighbor.placementUuid) return;
      const meSort = me.sortOrder ?? 0;
      const neighborSort = neighbor.sortOrder ?? 0;
      // Already tied — bump my side by a small delta in the desired
      // direction so the reorder takes visible effect. Falls back to a
      // single UPDATE; the relative order is otherwise stable-sort dependent.
      if (meSort === neighborSort) {
        await postOperation({
          entity_urn: `urn:evershop:cms:widget_placement:${me.placementUuid}`,
          old_payload: { sort_order: meSort },
          new_payload: {
            sort_order: direction === 'up' ? meSort - 1 : meSort + 1
          }
        });
        pushPreviewToIframe();
        return;
      }
      // Swap the two `sort_order` values. Two ops with monotonic
      // `change_order` so the overlay engine applies them in order; the
      // intermediate tied state is never observed by the iframe (preview
      // only refetches after both POSTs resolve).
      const meOk = await postOperation({
        entity_urn: `urn:evershop:cms:widget_placement:${me.placementUuid}`,
        old_payload: { sort_order: meSort },
        new_payload: { sort_order: neighborSort }
      });
      if (!meOk) return;
      await postOperation({
        entity_urn: `urn:evershop:cms:widget_placement:${neighbor.placementUuid}`,
        old_payload: { sort_order: neighborSort },
        new_payload: { sort_order: meSort }
      });
      pushPreviewToIframe();
    },
    [postOperation, pushPreviewToIframe]
  );

  // Duplicate a widget: clone its settings into a new widget_instance and
  // place a copy IMMEDIATELY after the original in the same area.
  //
  // The naive "copy.sort_order = original.sort_order + 1" produces a tie
  // when another sibling already sits at that value, and stable sort can
  // then position the copy somewhere arbitrary in the run. To guarantee the
  // copy is the immediate next entry, we walk forward from the original
  // and bump any sibling that would collide (UPDATE op per displaced
  // sibling) until we hit a natural gap. Common case (no tail collision):
  // 2 ops total (widget INSERT + placement INSERT). Worst case
  // (tightly-packed run): N+2 ops.
  const duplicateWidget = useCallback(
    async (uid: string, area: string) => {
      const overlay = overlayWidgetsRef.current;
      const siblings = overlay
        .filter((w) => Array.isArray(w.areaId) && w.areaId.includes(area))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const idx = siblings.findIndex((w) => w.uuid === uid);
      if (idx < 0) return;
      const overlayMe = siblings[idx];
      if (!overlayMe.placementUuid) return;

      // Pull metadata (name, rawSettings, route) from layerWidgets — the
      // overlay payload carries already-merged `settings` but not `name` or
      // raw stored shape.
      const flat = flatLayerWidgets();
      const meta = flat.find((w) => w?.uuid === uid);
      const myPlacement =
        (meta && placementInArea(meta.placements, area)) ?? null;

      const copySort = (overlayMe.sortOrder ?? 0) + 1;

      // Shift down any siblings that would land at or before copySort.
      // Iterate forward, raising each colliding sibling to `expected` so
      // every step strictly increases. Stop as soon as a sibling already
      // sits past expected — there's a natural gap and no more shifting
      // needed.
      let expected = copySort + 1;
      for (let i = idx + 1; i < siblings.length; i++) {
        const sib = siblings[i];
        const sibSort = sib.sortOrder ?? 0;
        if (sibSort >= expected) break;
        if (!sib.placementUuid) {
          expected++;
          continue;
        }
        const bumpOk = await postOperation({
          entity_urn: `urn:evershop:cms:widget_placement:${sib.placementUuid}`,
          old_payload: { sort_order: sibSort },
          new_payload: { sort_order: expected }
        });
        if (!bumpOk) return;
        expected++;
      }

      const newWidgetUuid = uuidv4();
      const newPlacementUuid = uuidv4();
      const widgetOk = await postOperation({
        entity_urn: `urn:evershop:cms:widget_instance:${newWidgetUuid}`,
        old_payload: null,
        new_payload: {
          uuid: newWidgetUuid,
          type: overlayMe.type ?? meta?.type,
          name: `${meta?.name || meta?.type || overlayMe.type} (copy)`,
          settings:
            (meta?.rawSettings as Record<string, unknown> | undefined) ??
            (overlayMe.settings as Record<string, unknown> | undefined) ??
            {},
          status: true
        }
      });
      if (!widgetOk) return;
      await postOperation({
        entity_urn: `urn:evershop:cms:widget_placement:${newPlacementUuid}`,
        old_payload: null,
        new_payload: {
          uuid: newPlacementUuid,
          widget_instance_uuid: newWidgetUuid,
          route: myPlacement?.route ?? route.id,
          area,
          sort_order: copySort,
          entity_urn: null
        }
      });
      pushPreviewToIframe();
    },
    [
      flatLayerWidgets,
      placementInArea,
      postOperation,
      pushPreviewToIframe,
      route.id
    ]
  );

  // Performs the delete without any confirmation. Wrapped by callers
  // (the WidgetChrome message handler, the SettingsDrawer footer) that
  // surface the ConfirmDialog first.
  const performDeleteWidget = useCallback(
    async (uid: string) => {
      // Cascade per spec § 7.10. Children of a container are placements
      // whose `area` matches `columnsContainer_<container>_col_*`. Walk
      // the subtree breadth-first via `Widget.columns` (which queries the
      // synthetic-area prefix server-side) and emit a DELETE op per
      // descendant widget_instance, bottom-up. Each op is its own
      // change_order entry — undo retraces them one at a time, which is
      // the documented trade-off for keeping the op model uniform.
      //
      // Limitation: source-only walk. Pending child INSERTs from this
      // session that haven't been published yet don't appear in
      // `Widget.columns` (resolver reads source widget_placement). On
      // publish, those orphans become placements pointing at a synthetic
      // area no one emits — render-time skipping handles the visual.
      // Cleaning them up properly waits until `widgetsForRoute` /
      // `Widget.columns` apply changeset overlay.
      const visited = new Set<string>();
      const queue: string[] = [uid];
      while (queue.length > 0) {
        const next = queue.shift() as string;
        if (visited.has(next)) continue;
        visited.add(next);
        const sub = await client
          .query(
            `query DescendantsOf($uuid: String!) {
               widgetByUuid(uuid: $uuid) {
                 columns { widgets { uuid } }
               }
             }`,
            { uuid: next },
            { requestPolicy: 'network-only' }
          )
          .toPromise();
        const cols =
          ((sub?.data as any)?.widgetByUuid?.columns as any[] | undefined) ??
          [];
        for (const col of cols) {
          for (const child of (col?.widgets as any[] | undefined) ?? []) {
            const childUid = child?.uuid;
            if (childUid && !visited.has(childUid)) queue.push(childUid);
          }
        }
      }
      // visited preserves insertion order in JS Sets; reversing yields
      // leaf-first emission, which keeps the publish path sensible if it
      // aborts mid-sequence.
      const ordered = [...visited].reverse();
      for (const targetUid of ordered) {
        await postOperation({
          entity_urn: `urn:evershop:cms:widget_instance:${targetUid}`,
          old_payload: { __delete: true },
          new_payload: null
        });
      }
      setSelectedWidget((prev) => (prev?.uid === uid ? null : prev));
      pushPreviewToIframe();
    },
    [client, postOperation, pushPreviewToIframe]
  );

  const deleteWidget = useCallback(
    (uid: string, widgetTypeHint?: string) => {
      // Container widgets (spec § 7.10): if this widget has children, the
      // confirm copy adds a note about orphaned children. Children's parent
      // FK becomes NULL on apply (no cascade); they remain in the DB but
      // stop rendering.
      const target = (layerWidgets as any[]).find((w) => w?.uuid === uid);
      const widgetType = (target?.type as string | undefined) ?? widgetTypeHint;
      const childCount = Array.isArray(target?.columns)
        ? target.columns.reduce(
            (sum: number, col: any) =>
              sum + (Array.isArray(col?.widgets) ? col.widgets.length : 0),
            0
          )
        : 0;
      const niceType = widgetType ? widgetType.replace(/_/g, ' ') : null;
      const childWidgetLabel =
        childCount === 1
          ? _('1 child widget')
          : _('${count} child widgets', { count: String(childCount) });
      const description =
        childCount > 0 ? (
          niceType ? (
            <>
              {_('Deleting this')} <strong>{niceType}</strong>{' '}
              {_('container will also hide')}{' '}
              <strong>{childWidgetLabel}</strong>.{' '}
              {_(
                'This will be saved as a pending change you can publish or discard.'
              )}
            </>
          ) : (
            <>
              {_('Deleting this container will also hide')}{' '}
              <strong>{childWidgetLabel}</strong>.{' '}
              {_(
                'This will be saved as a pending change you can publish or discard.'
              )}
            </>
          )
        ) : niceType ? (
          <>
            {_('Delete this')} <strong>{niceType}</strong>{' '}
            {_(
              'widget? This will be saved as a pending change you can publish or discard.'
            )}
          </>
        ) : (
          <>
            {_(
              'Delete this widget? This will be saved as a pending change you can publish or discard.'
            )}
          </>
        );
      setConfirmState({
        title:
          childCount > 0
            ? _('Delete container widget?')
            : _('Delete widget?'),
        description,
        confirmLabel: _('Delete'),
        destructive: true,
        onConfirm: () => performDeleteWidget(uid)
      });
    },
    [layerWidgets, performDeleteWidget]
  );

  // Read an image's natural dimensions admin-side (mirrors ImagePickerField),
  // so inline image picks persist width/height like the drawer does.
  const loadImageDimensions = (
    url: string
  ): Promise<{ width: number; height: number } | null> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });

  // FileBrowser pick handler for inline image editing. Writes the chosen URL
  // (+ captured dimensions) into the page form; the per-uid debounce collapses
  // it into a single op — same path as the drawer's ImagePickerField.
  const handlePickImage = async (file: string) => {
    if (!imageEdit) return;
    const { widgetUid, fields } = imageEdit;
    setImageEdit(null);
    const url = (file || '').replace(/\/{2,}/g, '/');
    const base = `block.${widgetUid}`;
    const dims =
      url && (fields.widthField || fields.heightField)
        ? await loadImageDimensions(url)
        : null;
    pageForm.setValue(`${base}.${fields.urlField}` as any, url, {
      shouldDirty: true,
      shouldTouch: true
    });
    if (dims && fields.widthField) {
      pageForm.setValue(`${base}.${fields.widthField}` as any, dims.width, {
        shouldDirty: true
      });
    }
    if (dims && fields.heightField) {
      pageForm.setValue(`${base}.${fields.heightField}` as any, dims.height, {
        shouldDirty: true
      });
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as
        | {
            type: 'widget-selected';
            widgetUid: string;
            widgetType: string;
            settings: Record<string, unknown>;
          }
        | {
            type: 'widget-delete';
            widgetUid: string;
            widgetType?: string;
          }
        | {
            type: 'inline-edit';
            widgetUid: string;
            fieldPath: string;
            value: string;
            settings: Record<string, unknown>;
          }
        | {
            type: 'add-to-column';
            parentUid: string;
            columnIndex: number;
          }
        | {
            type: 'edit-image';
            widgetUid: string;
            fields: {
              urlField: string;
              widthField?: string;
              heightField?: string;
            };
          }
        | null;
      if (!msg) return;
      if (msg.type === 'widget-selected') {
        setSelectedWidget({
          uid: msg.widgetUid,
          type: msg.widgetType,
          settings: msg.settings ?? {}
        });
        return;
      }
      if (msg.type === 'widget-delete') {
        deleteWidget(msg.widgetUid, msg.widgetType);
        return;
      }
      if ((msg as any).type === 'widget-move-up') {
        void moveWidget((msg as any).widgetUid, (msg as any).area, 'up');
        return;
      }
      if ((msg as any).type === 'widget-move-down') {
        void moveWidget((msg as any).widgetUid, (msg as any).area, 'down');
        return;
      }
      if ((msg as any).type === 'widget-duplicate') {
        void duplicateWidget((msg as any).widgetUid, (msg as any).area);
        return;
      }
      if (msg.type === 'inline-edit') {
        // Spec § 7.3.1: write the new value into the page-level form. The
        // per-uid `useWatch` debounce above turns it into a single UPDATE
        // op — same code path as the settings drawer. Editable already
        // merged the patch against WidgetContext.settings and supplies
        // the FULL new settings.
        const fullSettings = msg.settings ?? {};
        pageForm.setValue(
          `block.${msg.widgetUid}.settings` as any,
          fullSettings,
          { shouldDirty: true, shouldTouch: true }
        );
        return;
      }
      if (msg.type === 'edit-image') {
        // Open the FileBrowser over the canvas for this widget+field(s).
        setImageEdit({ widgetUid: msg.widgetUid, fields: msg.fields });
        return;
      }
      if (msg.type === 'add-to-column') {
        setPendingParent({
          parentUid: msg.parentUid,
          columnIndex: msg.columnIndex
        });
        setActiveLeftTab('widgets');
        return;
      }
      if ((msg as any).type === 'pb-canvas-click') {
        // Click in iframe but not on a widget. Treat as "click outside the
        // selection target": close the drawer (unless pinned) and clear
        // any active layer-row highlight to keep the panel state in sync
        // with the iframe (which clears its own layer-hover attribute on
        // body click — see PageBuilderBridge).
        if (!drawerPinned) setSelectedWidget(null);
        setLayerHighlightedUid(null);
        return;
      }
      if ((msg as any).type === 'pb-drop') {
        const widgetType = (msg as any).widgetType as string;
        const sortOrder = (msg as any).sortOrder;
        const dropArea = (msg as any).area as string | undefined;
        const isGlobal = (msg as any).isGlobal === true;
        const wt = widgetTypes.find((w) => w.code === widgetType);
        if (!wt) return;
        // The iframe is the source of truth for drop positioning — it walks
        // sibling DOM elements (via `computeDropSortOrder`) and computes the
        // midpoint sort_order locally. We just forward that value plus the
        // target area to `handleAddWidget`. If the message lacks `sortOrder`
        // (older iframe build, theoretically), handleAddWidget falls back to
        // `100` which is safe but not position-aware.
        //
        // `isGlobal` is set by the drop zone when the target area is
        // wrapped in `<Area isGlobal>` (header, footer, etc.). We use it
        // to default the new placement to `route='all'` so the widget
        // shows on every page — matching how those slots naturally behave.
        void handleAddWidget(wt, {
          sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
          area: dropArea,
          isGlobal
        });
        return;
      }
      if ((msg as any).type === 'preview-rendered') {
        // The iframe finished a render and reported its widget UUIDs in
        // DOM order. Layers tab uses this to display widgets in the same
        // order the storefront actually paints them — Area positioning
        // (header → content → footer) plus per-area sort_order combined.
        const order = (msg as any).widgetOrder;
        if (Array.isArray(order)) {
          setIframeWidgetOrder(order as string[]);
        }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    deleteWidget,
    pageForm,
    handleAddWidget,
    widgetTypes,
    drawerPinned,
    moveWidget,
    duplicateWidget
  ]);

  return (
    <FormProvider {...pageForm}>
      <div className="page-builder-editor fixed inset-0 z-1100 flex flex-col bg-background">
        {/* Topbar (52px) */}
        <header className="flex items-center justify-between h-13 px-4 border-b border-divider bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <a
              href={dashboardUrl}
              onClick={(e) => {
                if (pendingSavesCount > 0) {
                  e.preventDefault();
                  requestNavigation(dashboardUrl);
                }
              }}
              className="flex items-center gap-2 select-none group"
              aria-label={_('EverShop · Back to page builder')}
            >
              <svg
                viewBox="0 0 256 282"
                fill="none"
                className="w-6 h-auto"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M63.6632 35.0703L0.336842 70.1406L0.134737 140.668L0 211.26L63.7305 246.459C98.7621 265.799 127.663 281.658 128 281.658C128.337 281.658 145.785 272.117 166.872 260.513C187.891 248.844 216.589 233.05 230.602 225.314L256 211.26V196.174V181.024L254.518 181.798C253.642 182.249 224.943 198.044 190.72 216.997C156.429 235.951 128.067 251.294 127.663 251.229C127.192 251.101 104.556 238.723 77.2716 223.637L27.6211 196.239V140.797V85.3549L50.0547 72.9771C62.3158 66.2081 84.8168 53.8303 99.9747 45.4496C115.065 37.0688 127.731 30.2353 128 30.2353C128.269 30.2353 145.853 39.8409 167.074 51.574L228.918 85.3549L238.672 79.8626L256 70.1406L228.918 55.3775C207.495 43.2577 128.472 -0.0643921 127.798 9.15527e-05C127.394 9.15527e-05 98.4926 15.7946 63.6632 35.0703Z"
                  fill="#008060"
                />
                <path
                  d="M192.674 105.146C158.046 124.293 129.213 140.152 128.606 140.281C127.933 140.475 111.023 131.449 88.9937 119.329L50.5263 98.055V113.334L50.5937 128.548L87.9832 149.178C108.531 160.524 126.046 170.065 126.922 170.387C128.269 170.839 137.701 165.875 191.731 136.026C226.493 116.751 255.192 100.827 255.528 100.569C255.798 100.311 255.933 93.4133 255.865 85.226L255.663 70.334L192.674 105.146Z"
                  fill="#008060"
                />
                <path
                  d="M248.926 129.451C245.221 131.449 216.657 147.244 185.398 164.521C154.139 181.798 128.337 195.917 128 195.917C127.663 195.917 110.215 186.375 89.1284 174.771L50.8632 153.626L50.6611 168.453C50.5263 179.8 50.7284 183.474 51.3347 184.055C52.6147 185.15 127.192 226.216 128 226.216C128.674 226.216 254.451 156.914 255.528 156.011C255.798 155.753 255.933 148.855 255.865 140.603L255.663 125.712L248.926 129.451Z"
                  fill="#008060"
                />
              </svg>
            </a>
            <span className="text-muted-foreground/60 select-none">/</span>
            <PageSwitcher
              pageRoutes={pageRoutes}
              currentRouteId={route.id}
              currentRouteName={route.name}
              routesWithDraftOps={routesWithDraftOps}
              editPathForRoute={editPathForRoute}
            />
            <SessionModeBadge
              rolloutPlan={changeset.rolloutPlan ?? null}
              onClick={() => setPickerOpen(true)}
              onEditSchedule={
                changeset.rolloutPlan
                  ? () => setIsScheduleEditorOpen(true)
                  : undefined
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGlobalsView((v) => !v)}
              aria-pressed={globalsView}
              className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium border transition-colors ${
                globalsView
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-card text-muted-foreground border-divider hover:text-foreground'
              }`}
              title={
                globalsView
                  ? _('Stop highlighting global areas')
                  : _('Highlight global areas on canvas')
              }
              aria-label={
                globalsView ? _('Hide global areas') : _('Show global areas')
              }
            >
              <Globe className="h-3.5 w-3.5" />
              {_('Globals')}
            </button>
            <div
              className="flex items-center bg-muted/40 rounded-md p-0.5 gap-0.5"
              role="group"
              aria-label={_('Canvas device width')}
            >
              <DeviceButton
                mode="desktop"
                active={deviceMode === 'desktop'}
                onClick={() => setDeviceMode('desktop')}
                icon={Monitor}
                label={_('Desktop')}
              />
              <DeviceButton
                mode="tablet"
                active={deviceMode === 'tablet'}
                onClick={() => setDeviceMode('tablet')}
                icon={Tablet}
                label={_('Tablet')}
              />
              <DeviceButton
                mode="phone"
                active={deviceMode === 'phone'}
                onClick={() => setDeviceMode('phone')}
                icon={Smartphone}
                label={_('Phone')}
              />
            </div>
            <div
              className="flex items-center gap-0.5"
              role="group"
              aria-label={_('Undo / Redo')}
            >
              <button
                type="button"
                onClick={() => handleMoveCurrent('undo')}
                disabled={!canUndo}
                className="inline-flex items-center justify-center h-7 w-8 rounded-md border border-divider bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                aria-label={_('Undo last change on this page')}
                title={
                  canUndo
                    ? _('Undo (⌘Z) — undoes your last edit on this page')
                    : _('Nothing to undo on this page')
                }
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveCurrent('redo')}
                disabled={!canRedo}
                className="inline-flex items-center justify-center h-7 w-8 rounded-md border border-divider bg-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                aria-label={_('Redo last undone change on this page')}
                title={
                  canRedo
                    ? _(
                        'Redo (⇧⌘Z) — re-applies the last undone edit on this page'
                      )
                    : _('Nothing to redo on this page')
                }
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-divider bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              {_('Preview')}
            </a>
            {changeset.rolloutPlan ? (
              <PrimaryActionButton
                mode="rollout"
                onSave={handleSyncRollout}
                onRevert={handleDiscard}
                onCancelRollout={handleCancelRolloutPlan}
                isSyncing={isSyncing}
                hasUnsavedChanges={hasUnsavedRolloutChanges}
              />
            ) : (
              <PrimaryActionButton
                mode="draft"
                onPublish={openPublishDialog}
                onSaveAsRollout={() => setIsRolloutDialogOpen(true)}
                onDiscard={handleDiscard}
                isPublishing={isPublishing}
              />
            )}
          </div>
        </header>

        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/30">
            {error}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Left rail — tabbed: Widgets / Pages / Layers. Collapses to 52px (icons only). */}
          <aside
            ref={leftRailRef}
            onScroll={() => {
              // Anchor rect would drift away from the hovered row — drop the
              // preview rather than show a misaligned card.
              if (hoverPreview) setHoverPreview(null);
            }}
            className={`shrink-0 border-r border-divider bg-card overflow-y-auto flex flex-col transition-[width] duration-150 ${
              leftRailCollapsed ? 'w-[52px]' : 'w-[260px]'
            }`}
          >
            {leftRailCollapsed ? (
              <div className="flex flex-col items-center pt-2 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setLeftRailCollapsed(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={_('Expand left rail')}
                  title={_('Expand')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="h-px w-7 bg-divider my-1" />
                <LeftTabButton
                  active={activeLeftTab === 'widgets'}
                  onClick={() => {
                    setActiveLeftTab('widgets');
                    setLeftRailCollapsed(false);
                  }}
                  icon={PuzzleIcon}
                  label={_('Widgets')}
                  collapsed
                />
                <LeftTabButton
                  active={activeLeftTab === 'pages'}
                  onClick={() => {
                    setActiveLeftTab('pages');
                    setLeftRailCollapsed(false);
                  }}
                  icon={FileText}
                  label={_('Pages')}
                  collapsed
                />
                <LeftTabButton
                  active={activeLeftTab === 'layers'}
                  onClick={() => {
                    setActiveLeftTab('layers');
                    setLeftRailCollapsed(false);
                  }}
                  icon={Layers}
                  label={_('Layers')}
                  collapsed
                />
              </div>
            ) : (
              <div className="flex items-stretch border-b border-divider shrink-0">
                <LeftTabButton
                  active={activeLeftTab === 'widgets'}
                  onClick={() => setActiveLeftTab('widgets')}
                  icon={PuzzleIcon}
                  label={_('Widgets')}
                />
                <LeftTabButton
                  active={activeLeftTab === 'pages'}
                  onClick={() => setActiveLeftTab('pages')}
                  icon={FileText}
                  label={_('Pages')}
                />
                <LeftTabButton
                  active={activeLeftTab === 'layers'}
                  onClick={() => setActiveLeftTab('layers')}
                  icon={Layers}
                  label={_('Layers')}
                />
                <button
                  type="button"
                  onClick={() => setLeftRailCollapsed(true)}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={_('Collapse left rail')}
                  title={_('Collapse panel')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {!leftRailCollapsed && (
              <>
                {activeLeftTab === 'widgets' && (
                  <>
                    {pendingParent && (
                      <div className="m-2 p-2 rounded-md bg-primary/10 border border-primary/30 text-xs">
                        <div className="font-medium text-primary mb-1">
                          {_('Adding to Column ${number}', {
                            number: String(pendingParent.columnIndex + 1)
                          })}
                        </div>
                        <div className="text-muted-foreground mb-2">
                          {_('Pick a widget below to insert as a child.')}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPendingParent(null)}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          {_('Cancel')}
                        </button>
                      </div>
                    )}
                    <div className="p-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          type="search"
                          value={widgetSearch}
                          onChange={(e) => setWidgetSearch(e.target.value)}
                          placeholder={_('Search widgets…')}
                          className="w-full text-sm pl-8 pr-2 py-2 rounded-md bg-muted/30 border border-divider focus:outline-none focus:ring-1 focus:ring-primary"
                          aria-label={_('Search widgets')}
                        />
                      </div>
                    </div>
                    {groupedWidgetTypes.length === 0 ? (
                      <div className="p-4 text-xs text-muted-foreground">
                        {widgetSearch.trim()
                          ? _('No widgets match "${query}".', {
                              query: widgetSearch.trim()
                            })
                          : _('No widgets available.')}
                      </div>
                    ) : (
                      <div className="px-2 pb-4">
                        {groupedWidgetTypes.map((group) => (
                          <section key={group.key} className="mb-3">
                            <h4 className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {group.label}
                            </h4>
                            <ul className="space-y-0.5">
                              {group.widgets.map((wt) => (
                                <li key={wt.code}>
                                  <button
                                    type="button"
                                    draggable
                                    onMouseEnter={(e) => {
                                      const rect = (
                                        e.currentTarget as HTMLElement
                                      ).getBoundingClientRect();
                                      const panel = leftRailRef.current;
                                      const anchorX = panel
                                        ? panel.getBoundingClientRect().right
                                        : rect.right;
                                      setHoverPreview({
                                        widget: wt,
                                        rect,
                                        anchorX
                                      });
                                    }}
                                    onMouseLeave={() => {
                                      setHoverPreview((cur) =>
                                        cur && cur.widget.code === wt.code
                                          ? null
                                          : cur
                                      );
                                    }}
                                    onDragStart={(e) => {
                                      // Drop the preview before the drag image
                                      // is captured — otherwise the floating
                                      // card shows up in the drag ghost.
                                      setHoverPreview(null);
                                      e.dataTransfer.effectAllowed = 'copy';
                                      e.dataTransfer.setData(
                                        'application/x-evershop-widget',
                                        wt.code
                                      );
                                      e.dataTransfer.setData(
                                        'text/plain',
                                        wt.code
                                      );
                                      const iframe = iframeRef.current;
                                      iframe?.contentWindow?.postMessage(
                                        {
                                          type: 'pb-drag-start',
                                          widgetType: wt.code
                                        },
                                        window.location.origin
                                      );
                                    }}
                                    onDragEnd={() => {
                                      const iframe = iframeRef.current;
                                      iframe?.contentWindow?.postMessage(
                                        { type: 'pb-drag-end' },
                                        window.location.origin
                                      );
                                    }}
                                    className="w-full text-left flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 transition-colors group cursor-grab active:cursor-grabbing select-none"
                                  >
                                    {(() => {
                                      const WidgetIcon = getWidgetIcon(wt.icon);
                                      return (
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40 border border-divider text-muted-foreground group-hover:text-foreground">
                                          <WidgetIcon className="h-3.5 w-3.5" />
                                        </span>
                                      );
                                    })()}
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-[13px] font-medium text-foreground truncate">
                                        {_(wt.name)}
                                      </span>
                                      {wt.description && (
                                        <span className="block text-[11px] text-muted-foreground truncate">
                                          {_(wt.description)}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {hoverPreview && activeLeftTab === 'widgets' && (
                  <WidgetPreviewCard
                    widget={hoverPreview.widget}
                    rect={hoverPreview.rect}
                    anchorX={hoverPreview.anchorX}
                  />
                )}

                {activeLeftTab === 'pages' && (
                  <div className="px-2 py-2">
                    <div className="px-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {_('Pages')}
                    </div>
                    <ul className="space-y-0.5">
                      {pageRoutes.map((r: any) => {
                        const isCurrent = r.id === route.id;
                        const hasDraftOps = routesWithDraftOps.has(r.id);
                        const target = editPathForRoute(r.id);
                        return (
                          <li key={r.id}>
                            <a
                              href={target}
                              onClick={(e) => {
                                if (isCurrent) e.preventDefault();
                                // Otherwise let the anchor follow naturally
                                // — the draft persists across routes.
                              }}
                              className={`flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                                isCurrent
                                  ? 'bg-primary/10'
                                  : 'hover:bg-muted/40'
                              }`}
                              aria-current={isCurrent ? 'page' : undefined}
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-xs text-foreground">
                                  {r.name}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground font-mono">
                                  {r.path}
                                </span>
                              </span>
                              {isCurrent ? (
                                <span className="shrink-0 text-[10px] tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                  {_('Current')}
                                </span>
                              ) : hasDraftOps ? (
                                <span
                                  className="shrink-0 text-[10px] tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30"
                                  title={_(
                                    'This route has unpublished changes in your draft'
                                  )}
                                >
                                  {_('Draft')}
                                </span>
                              ) : (
                                <span className="shrink-0 text-[10px] tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                                  {_('Live')}
                                </span>
                              )}
                            </a>
                          </li>
                        );
                      })}
                      {pageRoutes.length === 0 && (
                        <li className="px-2 py-2 text-xs text-muted-foreground">
                          {_('No editable routes.')}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {activeLeftTab === 'layers' && (
                  <ul className="p-2 space-y-0.5">
                    {layerWidgets.map((w: any) => (
                      <LayerNode
                        key={w.uuid}
                        widget={w}
                        widgetTypesByCode={widgetTypesByCode}
                        selectedUid={layerHighlightedUid}
                        onSelect={(uid) => {
                          setLayerHighlightedUid(uid);
                          // Tell the iframe to highlight (hover-style outline)
                          // and scroll the matching widget into view. Does
                          // NOT open the settings drawer — that stays the
                          // job of the iframe toolbar's Settings button.
                          iframeRef.current?.contentWindow?.postMessage(
                            { type: 'layer-highlight', widgetUid: uid },
                            window.location.origin
                          );
                        }}
                      />
                    ))}
                    {layerWidgets.length === 0 && (
                      <li className="px-2 py-2 text-xs text-muted-foreground">
                        {_('No widgets on this route yet.')}
                      </li>
                    )}
                  </ul>
                )}
              </>
            )}
          </aside>

          {/* Canvas — iframe (relative so the drawer can absolute-position over it).
            Click on the padding area (target === currentTarget) deselects the
            current widget when the drawer isn't pinned. Spec § 7.5. */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- click-empty-canvas-to-deselect is a mouse convenience; keyboard users deselect via the layers panel / Escape */}
          <main
            className="flex-1 bg-muted/20 p-4 overflow-hidden relative"
            onClick={(e) => {
              if (drawerPinned) return;
              if (e.target !== e.currentTarget) return;
              setSelectedWidget(null);
            }}
          >
            <div
              className="h-full mx-auto bg-background rounded-md shadow-sm overflow-hidden border border-divider transition-all"
              style={{
                maxWidth: DEVICE_WIDTHS[deviceMode] ?? '100%',
                width: '100%'
              }}
            >
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title={_('Page builder canvas')}
                className="w-full h-full border-0"
              />
            </div>

            {selectedWidget && (
              <SettingsDrawer
                key={selectedWidget.uid}
                widget={selectedWidget}
                widgetTypeName={widgetTypesByCode.get(selectedWidget.type)?.name}
                currentRouteId={route.id}
                containerRef={drawerRef}
                shareableRoutes={pageRoutes.map((r: any) => ({
                  id: r.id,
                  name: r.name,
                  path: r.path
                }))}
                pinned={drawerPinned}
                onTogglePin={toggleDrawerPin}
                onAddPlacement={addPlacement}
                onRemovePlacement={removePlacement}
                onClose={() => setSelectedWidget(null)}
                // Seed placements so newly-dropped widgets reflect their
                // staged (changeset) placement immediately — `widgetByUuid`
                // reads source-only and would miss it.
                //
                // Priority: drop-time placements set by `handleAddWidget`
                // (the most direct signal — no async refresh needed), then
                // fall back to the editor's overlay-applied layerWidgets
                // (covers widgets the merchant clicks after navigation).
                initialPlacements={(() => {
                  if (selectedWidget.initialPlacements?.length) {
                    return selectedWidget.initialPlacements;
                  }
                  const w = flatLayerWidgets().find(
                    (x: any) => x?.uuid === selectedWidget.uid
                  );
                  const ps = (w?.placements ?? []) as any[];
                  return ps
                    .filter((p) => p && p.entity_urn == null)
                    .map((p) => ({
                      uuid: p.uuid as string,
                      route: p.route as string,
                      area: p.area as string,
                      sortOrder: (p.sortOrder ?? p.sort_order ?? 0) as number
                    }));
                })()}
              />
            )}
          </main>
        </div>

        {/* FileBrowser is its own fixed full-screen modal (`.file-browser`
            is position:fixed inset-0 with its own close button) — render it
            bare, like the EditorJS image tool does. The z-[1300] wrapper forms
            a stacking context so it sits above the page-builder editor shell
            (z-[1100]); FileBrowser's z-[1000] alone would be hidden behind it. */}
        {imageEdit && (
          <div className="relative z-[1300]">
            <FileBrowser
              isMultiple={false}
              onInsert={handlePickImage}
              close={() => setImageEdit(null)}
            />
          </div>
        )}

        <PublishDialog
          open={isPublishDialogOpen}
          onClose={() => setIsPublishDialogOpen(false)}
          onConfirm={handlePublish}
          isBusy={isPublishing}
          operations={operations}
        />

        <RolloutDialog
          open={isRolloutDialogOpen}
          onClose={() => {
            setIsRolloutDialogOpen(false);
            // If the dialog was triggered by the exit-confirm flow (so a
            // pending exit URL is captured), abandon that flow on cancel
            // since the user chose not to save as a rollout.
            if (pendingExitUrl) setPendingExitUrl(null);
          }}
          onSubmit={(plan) => {
            setIsRolloutDialogOpen(false);
            handleScheduleRollout(plan);
          }}
          isBusy={isPublishing}
          existingPlans={upcomingAndLiveRolloutPlans}
        />

        {/* Schedule-editor instance for rollout-edit mode. Opens via the
            pencil icon in SessionModeBadge; closes after a successful PATCH
            and reloads to pick up the new name/window from props. */}
        {changeset.rolloutPlan && (
          <RolloutDialog
            open={isScheduleEditorOpen}
            onClose={() => {
              if (!isUpdatingSchedule) setIsScheduleEditorOpen(false);
            }}
            onSubmit={handleUpdateRolloutSchedule}
            isBusy={isUpdatingSchedule}
            existingPlans={upcomingAndLiveRolloutPlans}
            editingPlan={{
              rolloutPlanId: changeset.rolloutPlan.rolloutPlanId,
              name: changeset.rolloutPlan.name,
              startTime: changeset.rolloutPlan.startTime?.text ?? '',
              endTime: changeset.rolloutPlan.endTime?.text ?? null
            }}
          />
        )}

        {(pickerOpen ||
          (!sessionAcknowledged &&
            (operations.length > 0 ||
              upcomingAndLiveRolloutPlans.length > 0 ||
              changeset.rolloutPlan != null))) && (
          <SessionPicker
            draftOpCount={operations.length}
            draftLastUpdated={null}
            rolloutPlans={upcomingAndLiveRolloutPlans}
            editPath={`${pickerHomeUrl}/edit/${encodeURIComponent(route.id)}`}
            allowDismiss={pickerOpen}
            onDismiss={() => {
              setPickerOpen(false);
              acknowledgeSession();
            }}
            onContinueDraft={() => {
              setPickerOpen(false);
              acknowledgeSession();
              // If the user was editing a rollout and now wants the draft,
              // navigate back to the route without the session param.
              if (changeset.rolloutPlan) {
                markIntentionalNavigation();
                window.location.href = `${pickerHomeUrl}/edit/${encodeURIComponent(
                  route.id
                )}`;
              }
            }}
            onStartFresh={async () => {
              try {
                if (operations.length > 0) {
                  await axios.post(discardChangesetUrl);
                }
                acknowledgeSession();
                markIntentionalNavigation();
                window.location.href = `${pickerHomeUrl}/edit/${encodeURIComponent(
                  route.id
                )}`;
              } catch (e) {
                const msg =
                  (e as any)?.response?.data?.error?.message ??
                  (e as Error).message ??
                  _('Could not start fresh');
                setError(msg);
                acknowledgeSession();
              }
            }}
          />
        )}

        <ConfirmDialog
          open={confirmState !== null}
          title={confirmState?.title ?? ''}
          description={confirmState?.description ?? ''}
          confirmLabel={confirmState?.confirmLabel}
          destructive={confirmState?.destructive}
          busy={confirmBusy}
          onConfirm={runConfirm}
          onCancel={() => {
            if (!confirmBusy) setConfirmState(null);
          }}
        />

        <DiscardConfirmDialog
          open={discardDialogOpen}
          currentRouteId={route.id}
          currentRouteName={route.name}
          currentRouteOpCount={discardCounts.currentRoute}
          routeBreakdown={discardCounts.breakdown}
          totalOpCount={discardCounts.total}
          busy={discardBusy}
          rolloutMode={changeset.rolloutPlan != null}
          onConfirm={(mode) => {
            void performDiscard(mode);
          }}
          onCancel={() => {
            if (!discardBusy) setDiscardDialogOpen(false);
          }}
        />

        {pendingExitUrl !== null &&
          (pendingSavesCount > 0 || operations.length > 0) && (
            <ExitConfirmDialog
              pendingCount={pendingSavesCount}
              unpublishedCount={operations.length}
              onStay={() => setPendingExitUrl(null)}
              onLeave={() => {
                const target = pendingExitUrl;
                setPendingExitUrl(null);
                markIntentionalNavigation();
                window.location.href = target;
              }}
              onSaveAsRollout={() => {
                // Defer the navigation until the rollout schedule succeeds.
                // handleScheduleRollout reads `pendingExitUrl` and navigates
                // there instead of the rollout list.
                setIsRolloutDialogOpen(true);
                // Note: we keep `pendingExitUrl` set; it's cleared when
                // handleScheduleRollout reads it.
              }}
            />
          )}
        <Toaster position="bottom-right" richColors />
      </div>
    </FormProvider>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    route(id: getContextValue("pageBuilderRouteId")) {
      id
      name
      path
      previewPath
    }
    changeset(id: getContextValue("pageBuilderChangesetId")) {
      changesetId
      uuid
      token
      routeCursors
      rolloutPlan {
        rolloutPlanId
        uuid
        name
        routeCursors
        startTime { text(format: "yyyy-LL-dd'T'HH:mm:ssZZ") }
        endTime { text(format: "yyyy-LL-dd'T'HH:mm:ssZZ") }
      }
    }
    widgetTypes {
      code
      name
      description
      category
      icon
      defaultSetting
    }
    addOperationUrl: url(routeId:"addChangesetOperation", params:[{key:"id", value:getContextValue("pageBuilderChangesetIdString")}])
    publishUrl: url(routeId:"publishChangeset", params:[{key:"id", value:getContextValue("pageBuilderChangesetIdString")}])
    createRolloutPlanUrl: url(routeId:"createRolloutPlan")
    updateRolloutPlanUrl: url(routeId:"updateRolloutPlan", params:[{key:"id", value:getContextValue("pageBuilderRolloutPlanIdString")}])
    syncRolloutPlanUrl: url(routeId:"syncRolloutPlan", params:[{key:"id", value:getContextValue("pageBuilderRolloutPlanIdString")}])
    cancelRolloutPlanUrl: url(routeId:"cancelRolloutPlan", params:[{key:"id", value:getContextValue("pageBuilderRolloutPlanIdString")}])
    moveCurrentChangeUrl: url(routeId:"moveCurrentChange", params:[{key:"id", value:getContextValue("pageBuilderChangesetIdString")}])
    discardChangesetUrl: url(routeId:"discardChangeset", params:[{key:"id", value:getContextValue("pageBuilderChangesetIdString")}])
    pickerHomeUrl: url(routeId:"pageBuilder")
    dashboardUrl: url(routeId:"dashboard")
  }
`;
