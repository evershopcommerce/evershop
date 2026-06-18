import Area from '@components/common/Area.js';
import { useAppDispatch } from '@components/common/context/app.js';
import { WidgetSettingsScope } from '@components/common/page-builder/WidgetSettingsScope.js';
import { Button } from '@components/common/ui/Button.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { Check, Pin, PinOff, Share2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'urql';
import { v4 as uuidv4 } from 'uuid';

// Per-widget default drawer widths. Spec § 7.5 — wider widgets get more
// breathing room. Falls back to DEFAULT for unmapped types.
const DRAWER_WIDTHS: Record<string, number> = {
  product_grid: 540,
  form_builder: 580,
  collection_products: 540
};
const DRAWER_WIDTH_DEFAULT = 400;
const DRAWER_WIDTH_MIN = 320;
const DRAWER_WIDTH_MAX = 900;
const WIDTH_STORAGE_PREFIX = 'pb_drawer_width_';

function readPersistedWidth(widgetType: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WIDTH_STORAGE_PREFIX + widgetType);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.min(DRAWER_WIDTH_MAX, Math.max(DRAWER_WIDTH_MIN, n));
  } catch {
    return null;
  }
}

function persistWidth(widgetType: string, width: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      WIDTH_STORAGE_PREFIX + widgetType,
      String(width)
    );
  } catch {
    // localStorage unavailable / quota — non-fatal.
  }
}

const WIDGET_PLACEMENTS_QUERY = `
  query WidgetPlacements($uuid: String!) {
    widgetByUuid(uuid: $uuid) {
      placements {
        uuid
        route
        area
        sortOrder
      }
    }
  }
`;

interface SelectedWidget {
  uid: string;
  type: string;
  settings: Record<string, unknown>;
}

interface SharableRoute {
  id: string;
  name: string;
  path?: string;
}

interface PlacementRow {
  uuid: string;
  route: string;
  area: string;
  sortOrder: number;
}

interface SettingsDrawerProps {
  widget: SelectedWidget;
  currentRouteId: string;
  shareableRoutes: SharableRoute[];
  pinned: boolean;
  onTogglePin: () => void;
  onAddPlacement: (
    route: string,
    placementUuid: string,
    area: string,
    sortOrder?: number
  ) => Promise<void>;
  onRemovePlacement: (placementUuid: string) => Promise<void>;
  onClose: () => void;
  /**
   * Optional initial placements seed. The Editor passes the overlay-applied
   * placements from `overlayWidgetsRef` so the drawer reflects the staged
   * (changeset) state even for widgets that haven't been published yet —
   * the `widgetByUuid` GraphQL query reads source-only and would miss them.
   */
  initialPlacements?: PlacementRow[];
  /**
   * The widget type's registered display name (e.g. "Collection products"),
   * looked up from `widgetTypes` by the Editor. Used (translated via `_()`) as
   * the drawer title; when absent we fall back to a title-cased form of the
   * type code.
   */
  widgetTypeName?: string;
  /**
   * Optional ref forwarded to the drawer's outer `<aside>`. The Editor uses
   * this to detect outside-clicks (clicks anywhere outside the drawer
   * collapse the drawer when it's not pinned).
   */
  containerRef?: React.MutableRefObject<HTMLElement | null>;
}

export function SettingsDrawer({
  widget,
  currentRouteId,
  shareableRoutes,
  pinned,
  onTogglePin,
  onAddPlacement,
  onRemovePlacement,
  onClose,
  containerRef,
  initialPlacements,
  widgetTypeName
}: SettingsDrawerProps): React.ReactElement {
  const { setData } = useAppDispatch();

  const [placementsResult, refetchPlacements] = useQuery({
    query: WIDGET_PLACEMENTS_QUERY,
    variables: { uuid: widget.uid }
  });
  const serverPlacements: PlacementRow[] =
    (placementsResult.data as any)?.widgetByUuid?.placements ?? [];

  // Optimistic placement state. The GraphQL `widgetByUuid.placements`
  // resolver reads from the published `widget_placement` table directly
  // — it does NOT apply the changeset overlay — so toggling a route would
  // appear to do nothing until publish. We keep a local Map keyed by
  // routeId, seeded from the server response and mutated immediately on
  // toggle so the UI reflects the user's intent right away.
  //
  // Each entry holds the placement uuid we're tracking for that route — for
  // server-known placements that's the DB uuid; for locally-added ones we
  // generate a fresh uuid here so we can target it with a DELETE op if the
  // user toggles the route off again. Without this, an ON → OFF → ON
  // sequence would emit two INSERT ops with different uuids for the same
  // (widget, route, area) triple and trip widget_placement_unique on
  // publish.
  // Seed routeMap from the parent's overlay-applied placements so newly-
  // dropped widgets (which only live in the changeset, not yet in the
  // published `widget_placement` table) reflect their staged placements
  // in the drawer immediately. The widgetByUuid GraphQL refresh fills
  // in any server-only updates that arrive later.
  const [routeMap, setRouteMap] = useState<Map<string, PlacementRow>>(() => {
    const initial = new Map<string, PlacementRow>();
    for (const p of initialPlacements ?? []) {
      if (!p.area || p.area === 'widget_setting_form') continue;
      initial.set(p.route, p);
    }
    return initial;
  });
  // Seed/refresh the local map whenever the server payload changes. New
  // server entries are merged in; locally-added entries are preserved
  // (their uuids are valid changeset uuids and survive publish).
  useEffect(() => {
    setRouteMap((prev) => {
      const next = new Map(prev);
      for (const p of serverPlacements) {
        if (!p.area || p.area === 'widget_setting_form') continue;
        // Server data is authoritative when it appears. Locally-added entries
        // not yet visible to the server stay as-is.
        next.set(p.route, p);
      }
      return next;
    });
  }, [placementsResult.data]);

  // "All routes" mode — a single placement with `route='all'` covers
  // every page. Mutually exclusive with per-route placements: toggling
  // it ON removes all per-route placements so the resolver doesn't
  // render the widget twice on routes that had both.
  const isAllMode = routeMap.has('all');

  const handleToggleAll = useCallback(
    async (checked: boolean) => {
      const targetArea =
        routeMap.get(currentRouteId)?.area ??
        Array.from(routeMap.values())[0]?.area ??
        'content';
      if (checked) {
        if (routeMap.has('all')) return;
        // Anchor on an existing per-route placement: reuse its area AND
        // sort_order so the storefront's cell dedupe collapses the
        // transient `[old, new]` pair while the per-route placements get
        // removed below — no flash to two widgets.
        const anchor =
          routeMap.get(currentRouteId) ?? Array.from(routeMap.values())[0];
        const anchorSortOrder = anchor?.sortOrder ?? 100;
        const newUuid = uuidv4();
        const allRow: PlacementRow = {
          uuid: newUuid,
          route: 'all',
          area: targetArea,
          sortOrder: anchorSortOrder
        };
        // Per-route placements to remove (everything except 'all' itself).
        const perRouteRows = Array.from(routeMap.values()).filter(
          (p) => p.route !== 'all'
        );
        // Optimistic: leave only the 'all' row in the map.
        setRouteMap(new Map([['all', allRow]]));
        await onAddPlacement('all', newUuid, targetArea, anchorSortOrder);
        for (const p of perRouteRows) {
          await onRemovePlacement(p.uuid);
        }
      } else {
        const allRow = routeMap.get('all');
        if (!allRow) return;
        // Don't strand the widget. When toggling off "All routes", insert
        // a per-route placement for the CURRENT route in the SAME area
        // AND sort_order as the 'all' placement. Matching sort_order is
        // what lets the storefront dedupe the transient pair into a
        // single render — without it, the iframe briefly shows the
        // widget twice during the add→remove gap.
        //
        // Order matters: add first, then remove, so the widget stays
        // rendered throughout the transition.
        const fallbackArea = allRow.area;
        const fallbackSortOrder = allRow.sortOrder ?? 100;
        const newUuid = uuidv4();
        const currentRow: PlacementRow = {
          uuid: newUuid,
          route: currentRouteId,
          area: fallbackArea,
          sortOrder: fallbackSortOrder
        };
        // Optimistic: replace 'all' with the current-route fallback.
        setRouteMap((prev) => {
          const next = new Map(prev);
          next.delete('all');
          next.set(currentRouteId, currentRow);
          return next;
        });
        await onAddPlacement(
          currentRouteId,
          newUuid,
          fallbackArea,
          fallbackSortOrder
        );
        await onRemovePlacement(allRow.uuid);
      }
      refetchPlacements({ requestPolicy: 'network-only' });
    },
    [
      currentRouteId,
      onAddPlacement,
      onRemovePlacement,
      refetchPlacements,
      routeMap
    ]
  );

  const handleToggleRoute = useCallback(
    async (routeId: string, checked: boolean) => {
      if (checked) {
        // No-op if already placed (defensive; UI prevents this path).
        if (routeMap.has(routeId)) return;
        // Derive the new placement's area + sort_order from the widget's
        // existing placements rather than hardcoding `content` / `100`.
        // Prefer the current route (where the merchant just clicked) so
        // a widget living in e.g. `headerMiddleLeft` gets shared to
        // other routes in the SAME slot, not dumped into the body.
        const anchor =
          routeMap.get(currentRouteId) ?? Array.from(routeMap.values())[0];
        const targetArea = anchor?.area ?? 'content';
        const anchorSortOrder = anchor?.sortOrder ?? 100;
        const newUuid = uuidv4();
        const optimisticRow: PlacementRow = {
          uuid: newUuid,
          route: routeId,
          area: targetArea,
          sortOrder: anchorSortOrder
        };
        setRouteMap((prev) => {
          const next = new Map(prev);
          next.set(routeId, optimisticRow);
          return next;
        });
        await onAddPlacement(routeId, newUuid, targetArea, anchorSortOrder);
      } else {
        const existing = routeMap.get(routeId);
        if (!existing) return;
        // Optimistically remove first so the checkbox flips instantly.
        setRouteMap((prev) => {
          const next = new Map(prev);
          next.delete(routeId);
          return next;
        });
        await onRemovePlacement(existing.uuid);
      }
      refetchPlacements({ requestPolicy: 'network-only' });
    },
    [
      currentRouteId,
      onAddPlacement,
      onRemovePlacement,
      refetchPlacements,
      routeMap
    ]
  );

  // Inject the selected widget into the editor's React-side context.widgets
  // map. This is what `<Area id="widget_setting_form">` reads to find which
  // widget's admin component to render. We restore the empty list on
  // unmount so future drawer mounts don't see stale widgets.
  useEffect(() => {
    setData((prev: any) => ({
      ...prev,
      widgets: [
        {
          id: `e${widget.uid.replace(/-/g, '')}`,
          areaId: ['widget_setting_form'],
          type: widget.type,
          sortOrder: 0,
          uuid: widget.uid,
          settings: widget.settings
        }
      ]
    }));
    return () => {
      setData((prev: any) => ({ ...prev, widgets: [] }));
    };
  }, [widget.uid, widget.type, widget.settings, setData]);

  // The page-level form (mounted by Editor via FormProvider) holds this
  // widget's settings under `block.<uid>.settings.*`. Auto-save is wired
  // up there (one useWatch per widget UID with a per-uid debounce). The
  // drawer just mounts the scope so field components participate.

  // ESC to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prefer the registered widget name (translated to the admin language) over a
  // title-cased form of the raw type code (e.g. "Simple Slider" from
  // `simple_slider`), which is never localized and may not match the real name.
  const widgetTitle = useMemo(
    () =>
      widgetTypeName
        ? _(widgetTypeName)
        : widget.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    [widget.type, widgetTypeName]
  );

  // Names of other routes (besides the current one) where this widget is
  // also placed. Used for the header chip and the "Settings change applies
  // to N routes" dynamic warning. In all-mode every shareable route is
  // implicitly covered, so the "others" list is every non-current route.
  const otherPlacedRouteNames = useMemo(() => {
    if (isAllMode) {
      return shareableRoutes
        .filter((r) => r.id !== currentRouteId)
        .map((r) => r.name);
    }
    const others: string[] = [];
    for (const r of shareableRoutes) {
      if (r.id === currentRouteId) continue;
      if (routeMap.has(r.id)) others.push(r.name);
    }
    return others;
  }, [shareableRoutes, currentRouteId, routeMap, isAllMode]);
  const sharedRouteCount = otherPlacedRouteNames.length + 1; // +1 for current
  const sharedSummary = useMemo(() => {
    if (otherPlacedRouteNames.length === 0) return null;
    if (otherPlacedRouteNames.length <= 2) {
      return _('Also shown on ${routes}', {
        routes: otherPlacedRouteNames.join(', ')
      });
    }
    const head = otherPlacedRouteNames.slice(0, 2).join(', ');
    return _('Also shown on ${routes} +${count}', {
      routes: head,
      count: String(otherPlacedRouteNames.length - 2)
    });
  }, [otherPlacedRouteNames]);

  // Share dropdown — toggle open/close + outside-click dismissal.
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!shareOpen) return;
    const onDown = (e: MouseEvent) => {
      const node = shareRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setShareOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [shareOpen]);

  // Width: persisted per widget type, falls back to per-type default, then
  // DEFAULT. Resize via drag on the left edge clamped to MIN..MAX.
  const [width, setWidth] = useState<number>(() => {
    const persisted = readPersistedWidth(widget.type);
    if (persisted !== null) return persisted;
    return DRAWER_WIDTHS[widget.type] ?? DRAWER_WIDTH_DEFAULT;
  });
  useEffect(() => {
    const persisted = readPersistedWidth(widget.type);
    setWidth(
      persisted ?? (DRAWER_WIDTHS[widget.type] ?? DRAWER_WIDTH_DEFAULT)
    );
  }, [widget.type]);

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null
  );
  const handleResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragStateRef.current = { startX: e.clientX, startWidth: width };

      // The iframe to the left of the drawer is a separate document; once
      // the cursor crosses into it, the parent window stops receiving
      // mousemove (the iframe captures them) and the drag thread dies.
      // That's why making the drawer BIGGER (dragging leftward, into the
      // iframe) lost focus while making it smaller worked fine. Disable
      // pointer events on the iframes for the duration of the drag and
      // restore them on mouseup. We also disable text selection on the
      // body so the cursor doesn't flicker between col-resize and the
      // text I-beam as it travels across the page.
      const iframes = Array.from(
        document.querySelectorAll<HTMLIFrameElement>('iframe')
      );
      const previousPointerEvents = iframes.map((f) => f.style.pointerEvents);
      iframes.forEach((f) => {
        f.style.pointerEvents = 'none';
      });
      const previousBodyUserSelect = document.body.style.userSelect;
      const previousBodyCursor = document.body.style.cursor;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const onMove = (ev: MouseEvent) => {
        const state = dragStateRef.current;
        if (!state) return;
        // Drawer is anchored right; dragging the left edge leftwards
        // increases width.
        const delta = state.startX - ev.clientX;
        const next = Math.min(
          DRAWER_WIDTH_MAX,
          Math.max(DRAWER_WIDTH_MIN, state.startWidth + delta)
        );
        setWidth(next);
      };
      const onUp = () => {
        dragStateRef.current = null;
        iframes.forEach((f, i) => {
          f.style.pointerEvents = previousPointerEvents[i] ?? '';
        });
        document.body.style.userSelect = previousBodyUserSelect;
        document.body.style.cursor = previousBodyCursor;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width]
  );
  // Persist on width change after the drag settles. Throttled by React's
  // batching; only the last value within a tick lands in localStorage.
  useEffect(() => {
    persistWidth(widget.type, width);
  }, [widget.type, width]);

  return (
    <aside
      ref={containerRef}
      className="absolute top-0 right-0 h-full bg-card border-l border-divider shadow-lg flex flex-col"
      style={{ width: `${width}px` }}
      aria-label={_('${title} settings', { title: widgetTitle })}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={_('Resize settings drawer')}
        title={_('Drag to resize')}
        onMouseDown={handleResizeStart}
        className="absolute top-0 left-0 h-full w-1 cursor-col-resize hover:bg-primary/30 transition-colors"
        style={{ touchAction: 'none' }}
      />
      <header className="flex items-center justify-between gap-2 px-4 h-[52px] border-b border-divider">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold truncate">{widgetTitle}</div>
            {sharedSummary && (
              <span
                className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20"
                title={_('Placed on: ${routes}', {
                  routes: [
                    shareableRoutes.find((r) => r.id === currentRouteId)
                      ?.name ?? _('current page'),
                    ...otherPlacedRouteNames
                  ].join(', ')
                })}
              >
                {sharedSummary}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {_('Auto-saves while you edit')}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePin}
            aria-label={pinned ? _('Unpin drawer') : _('Pin drawer open')}
            aria-pressed={pinned}
            title={
              pinned
                ? _('Unpin — drawer will close when you click empty canvas')
                : _('Pin — keep drawer open across canvas clicks')
            }
          >
            {pinned ? (
              <Pin className="h-4 w-4 text-primary" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={_('Close settings')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <WidgetSettingsScope uid={widget.uid}>
          <Area id="widget_setting_form" />
        </WidgetSettingsScope>
      </div>

      {shareableRoutes.length > 0 && (
        <footer className="border-t border-divider p-3">
          <div ref={shareRef} className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={shareOpen}
              className={`w-full flex items-center justify-between gap-2 px-3 h-9 rounded-md border text-sm font-medium transition-colors ${
                shareOpen
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-divider bg-card text-foreground hover:bg-muted/40'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5" />
                {_('Share')}
              </span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                  shareOpen
                    ? 'bg-card text-muted-foreground'
                    : 'bg-muted/50 text-muted-foreground'
                }`}
                aria-label={_('${count} routes', {
                  count: String(sharedRouteCount)
                })}
              >
                {sharedRouteCount}
              </span>
            </button>
            {shareOpen && (
              <div
                className="absolute left-0 right-0 bottom-[calc(100%+8px)] z-30 bg-card border border-divider rounded-md shadow-lg p-1.5 max-h-[60vh] overflow-y-auto"
                role="menu"
              >
                <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {_('Show on routes')}
                </div>
                {/* "All routes" — single shortcut that covers every page via
                    a `route='all'` placement. Mutually exclusive with the
                    per-route checkboxes below; toggling it on removes
                    any existing per-route placements so the widget doesn't
                    render twice on routes that had both. */}
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isAllMode}
                  onClick={() => handleToggleAll(!isAllMode)}
                  className={`w-full text-left flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer ${
                    isAllMode ? 'bg-primary/10' : 'hover:bg-muted/40'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isAllMode
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-card border-input'
                    }`}
                    aria-hidden="true"
                  >
                    {isAllMode && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-foreground truncate">
                        {_('All routes')}
                      </span>
                      <span className="shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                        {_('Global')}
                      </span>
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {_('Show this widget on every page')}
                    </span>
                  </span>
                </button>
                <div className="my-1 border-t border-divider/60" />
                {shareableRoutes.map((r) => {
                  const isCurrent = r.id === currentRouteId;
                  // In all-mode every route is implicitly covered; show
                  // them as checked and disabled so the UI reflects the
                  // global state without competing with the route list.
                  const isPlaced =
                    isAllMode || isCurrent || routeMap.has(r.id);
                  // Lock the current route's checkbox if it's the only
                  // route this widget is on — must always live somewhere.
                  // Also lock all rows while in all-mode (per-route toggles
                  // are inert when "All routes" owns the placement).
                  const lockCurrent =
                    (isCurrent && sharedRouteCount === 1) || isAllMode;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={isPlaced}
                      disabled={lockCurrent}
                      onClick={() => {
                        if (isCurrent) return; // current row is informational
                        if (isAllMode) return; // covered by All routes
                        handleToggleRoute(r.id, !isPlaced);
                      }}
                      className={`w-full text-left flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors ${
                        isPlaced ? 'bg-primary/10' : 'hover:bg-muted/40'
                      } ${
                        lockCurrent
                          ? 'cursor-not-allowed'
                          : 'cursor-pointer'
                      } ${isAllMode && !isCurrent ? 'opacity-60' : ''}`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isPlaced
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-card border-input'
                        }`}
                        aria-hidden="true"
                      >
                        {isPlaced && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-foreground truncate">
                            {r.name}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                              {_('Current')}
                            </span>
                          )}
                        </span>
                        {r.path && (
                          <span className="block text-[11px] font-mono text-muted-foreground truncate">
                            {r.path}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                <div className="border-t border-divider mt-1.5 pt-2 px-2 pb-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <Share2 className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    {_(
                      'Edits to a shared widget update every route it appears on.'
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}
    </aside>
  );
}
