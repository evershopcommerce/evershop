import { useAppState } from '@components/common/context/app.js';
import { AreaStartDropZone } from '@components/common/page-builder/AreaStartDropZone.js';
import { useIsInPageBuilderIframe } from '@components/common/page-builder/pageBuilderMode.js';
import { WidgetChrome } from '@components/common/page-builder/WidgetChrome.js';
import { generateComponentKey } from '@evershop/evershop/lib/util/keyGenerator';
import type { WidgetInstance } from '@evershop/evershop/types/widget';
import React, { useEffect, useState } from 'react';
import type { ElementType } from 'react';

/**
 * Subscribe to the page-builder iframe's "Globals view" toggle, surfaced as
 * `body[data-evershop-globals-view="1"]` by `PageBuilderBridge`. Used by
 * Area to opt into a wrapper element only when the user is actively
 * inspecting global areas — so production storefront (and iframe-with-
 * Globals-OFF) keeps the same DOM shape as today.
 *
 * Returns `false` outside the iframe (production storefront): the bridge
 * never sets the body attribute, MutationObserver never fires, state stays
 * at the initial `false`.
 */
function useGlobalsViewActive(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const sync = () => {
      setActive(document.body?.dataset?.evershopGlobalsView === '1');
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-evershop-globals-view']
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

interface Component {
  id?: string;
  sortOrder?: number;
  props?: Record<string, any>;
  component: {
    default: React.ElementType | React.ReactNode;
  };
  /**
   * Page builder metadata. Set when this entry is a widget instance — used
   * by the iframe chrome to identify the widget for selection / delete /
   * inline-edit. Undefined for regular layout components.
   */
  _widgetMeta?: {
    uuid: string;
    type: string;
    settings: Record<string, unknown>;
  };
}

type AreaID = string;
type ComponentID = string;

interface Components {
  [key: AreaID]: {
    [key: ComponentID]: Component;
  };
}

// Route-keyed component registry. Replaces the legacy `Area.defaultProps.components`
// data-channel — function-component `defaultProps` is ignored in React 19, which
// would silently blank every page. Prod client bundles register exactly one route;
// the dev loader and the (future) single server bundle register every route. `Area`
// selects the current request's route below via the app-state context.
const areaComponentRegistry: Record<string, Components> = {};

export function setAreaComponents(routeId: string, map: Components): void {
  areaComponentRegistry[routeId] = map;
}

export function getAreaComponents(routeId: string | undefined): Components {
  return (routeId && areaComponentRegistry[routeId]) || {};
}

interface AreaProps {
  className?: string;
  coreComponents?: Component[];
  id: string;
  noOuter?: boolean;
  wrapper?: React.ReactNode | string;
  wrapperProps?: Record<string, any>;
  components?: Components;
  /**
   * True for areas that appear on every page (e.g. header, footer).
   * Informational only — used by the page-builder admin to surface
   * "this area appears on every page" warnings when editing.
   */
  isGlobal?: boolean;
  /**
   * Opt this area into page-builder editing. When false (the default),
   * the page builder UI does not expose this area as a drop target,
   * even if it is rendered in the SSR'd preview. Protects layout-only
   * or system-message areas from accidental edits.
   */
  editableInPageBuilder?: boolean;
  [key: string]: unknown;
}

const DEBUG_KEY = 'evershop_area_debug';

let toggleButtonMounted = false;
let debugStylesMounted = false;

function injectDebugStyles() {
  if (process.env.NODE_ENV !== 'development') return;
  if (debugStylesMounted || typeof document === 'undefined') return;
  debugStylesMounted = true;
  const style = document.createElement('style');
  style.id = 'evershop-debug-styles';
  style.textContent = [
    '.evershop-debug-area__badge { opacity: 0; transition: opacity 0.15s ease; }',
    '.evershop-debug-area:hover > .evershop-debug-area__badge { opacity: 1; }'
  ].join('\n');
  document.head.appendChild(style);
}

function injectToggleButton() {
  if (process.env.NODE_ENV !== 'development') return;
  if (toggleButtonMounted || typeof document === 'undefined') return;
  toggleButtonMounted = true;

  const btn = document.createElement('button');

  const update = () => {
    const active = localStorage.getItem(DEBUG_KEY) === '1';
    btn.textContent = active ? 'Debug: ON' : 'Debug: OFF';
    btn.style.background = active ? '#3b82f6' : '#6b7280';
  };

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: '99999',
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'background 0.2s'
  });

  btn.title = 'Toggle Area debug mode';
  update();

  btn.addEventListener('click', () => {
    const next = localStorage.getItem(DEBUG_KEY) === '1' ? '0' : '1';
    localStorage.setItem(DEBUG_KEY, next);
    // Notify all tabs and same-page listeners
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: DEBUG_KEY,
        newValue: next,
        storageArea: localStorage
      })
    );
    update();
  });

  document.body.appendChild(btn);
}

function useDebugMode(): boolean {
  const [debug, setDebug] = useState(() => {
    if (process.env.NODE_ENV !== 'development') return false;
    try {
      return localStorage.getItem(DEBUG_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    injectToggleButton();
    injectDebugStyles();

    const handler = (e: StorageEvent) => {
      if (e.key === DEBUG_KEY) {
        setDebug(e.newValue === '1');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return debug;
}

const AREA_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#db2777',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f43f5e'
];

// Stable color per area ID
function areaColor(id: string | undefined): string {
  if (!id) return AREA_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return AREA_COLORS[Math.abs(hash) % AREA_COLORS.length];
}

function Area(props: AreaProps) {
  const context = useAppState();
  const debug = useDebugMode();
  // True only inside the page-builder iframe (false on SSR + production
  // storefront). Used to gate the per-renderable sort_order wrapper so
  // production DOM is byte-for-byte identical to today.
  const inPageBuilder = useIsInPageBuilderIframe();
  const {
    id,
    coreComponents = [],
    wrapperProps = {},
    noOuter = false,
    wrapper = 'div',
    className,
    components: componentsProp,
    isGlobal,
    editableInPageBuilder
  } = props;

  // Route-scoped component map. Sourced from the registry (populated by the route
  // entry / dev loader), keyed by the current request's route. An explicit
  // `components` prop is still honored if one is ever passed directly.
  const currentRouteId = context?.config?.pageMeta?.route?.id;
  const components = componentsProp ?? getAreaComponents(currentRouteId);

  const areaComponents = (() => {
    const areaCoreComponents = coreComponents || [];
    const widgets = context.widgets || [];
    const wildCardWidgets = components?.['*'] || {};
    const assignedWidgets: Component[] = [];

    widgets.forEach((widget: WidgetInstance) => {
      const adminKey = generateComponentKey(`admin_widget_${widget.type}`);
      const frontKey = generateComponentKey(`widget_${widget.type}`);
      const w = wildCardWidgets[adminKey] || wildCardWidgets[frontKey];
      if (widget.areaId.includes(id) && w !== undefined) {
        assignedWidgets.push({
          id: widget.id,
          sortOrder: widget.sortOrder,
          props: widget.props,
          component: w.component,
          // Tag with widget metadata so the page-builder chrome can wrap
          // this entry. `uuid` and `settings` are populated by the global
          // response middleware (`base/pages/global/response[errorHandler]`)
          // for page-builder iframe loads.
          _widgetMeta: widget.uuid
            ? {
                uuid: widget.uuid,
                type: widget.type,
                settings:
                  ((widget as unknown) as { settings?: Record<string, unknown> })
                    .settings ?? {}
              }
            : undefined
        });
      }
    });
    const cs =
      components?.[id] === undefined
        ? areaCoreComponents.concat(assignedWidgets)
        : areaCoreComponents
            .concat(Object.values(components[id]))
            .concat(assignedWidgets);
    return cs.sort(
      (obj1, obj2) => (obj1.sortOrder || 0) - (obj2.sortOrder || 0)
    );
  })();
  const { propsMap } = context;

  // Forces a real wrapper in two situations where the data-evershop-* attrs
  // need to land somewhere:
  //   1. Development debug mode — outline + label rendering needs a real
  //      element. `process.env.NODE_ENV` lets Terser drop this in prod.
  //   2. Page-builder iframe with the Globals overlay toggled on, AND this
  //      Area is marked `isGlobal`. The user opted into "show me the
  //      globals" — the violet outline can only attach to a real element.
  //      When the toggle is off (default), `noOuter` is honored as-is so
  //      the iframe layout matches the production storefront exactly.
  const globalsViewActive = useGlobalsViewActive();
  const effectiveNoOuter =
    (process.env.NODE_ENV === 'development' && debug) ||
    (globalsViewActive && isGlobal === true)
      ? false
      : noOuter;

  let WrapperComponent: ElementType = React.Fragment;
  if (effectiveNoOuter !== true) {
    if (wrapper !== undefined) {
      WrapperComponent = wrapper as ElementType;
    } else {
      WrapperComponent = 'div';
    }
  }

  let areaWrapperProps: Record<string, any> = {};
  if (effectiveNoOuter === true) {
    areaWrapperProps = {};
  } else if (typeof wrapperProps === 'object' && wrapperProps !== null) {
    areaWrapperProps = { className: className || '', ...wrapperProps };
  } else {
    areaWrapperProps = { className: className || '' };
  }
  // Page-builder hooks: tag global / editable areas with data attributes
  // so the iframe's "Globals" overlay (toggled from the editor topbar)
  // can outline them via CSS without needing per-area JS.
  if (effectiveNoOuter !== true) {
    if (isGlobal) {
      areaWrapperProps['data-evershop-global'] = 'true';
    }
    if (editableInPageBuilder) {
      areaWrapperProps['data-evershop-editable-area'] = 'true';
    }
    areaWrapperProps['data-evershop-area-id'] = id;
  }

  const color =
    process.env.NODE_ENV === 'development' && debug ? areaColor(id) : '';

  if (
    process.env.NODE_ENV === 'development' &&
    debug &&
    effectiveNoOuter !== true
  ) {
    const existingStyle = areaWrapperProps.style || {};
    const existingClass = (areaWrapperProps.className || '') as string;
    areaWrapperProps = {
      ...areaWrapperProps,
      className: `${existingClass} evershop-debug-area`.trim(),
      style: {
        ...existingStyle,
        position: 'relative',
        border: `2px dashed ${color}`,
        padding: '5px',
        boxSizing: 'border-box',
        minHeight: '32px'
      }
    };
  }

  const renderedChildren = areaComponents.map((w, index) => {
    const C = w.component.default;

    const { id: componentId } = w;
    const propsData = context.graphqlResponse;
    const propKeys =
      componentId !== undefined ? propsMap[componentId] || [] : [];

    const componentProps = propKeys.reduce(
      (acc: Record<string, any>, map: Record<string, any>) => {
        const { origin, alias } = map;
        acc[origin] = propsData[alias];
        return acc;
      },
      {}
    );
    if (w.props) {
      Object.assign(componentProps, w.props);
    }

    let rendered: React.ReactNode = null;

    if (React.isValidElement(C)) {
      rendered = <React.Fragment key={index}>{C}</React.Fragment>;
    } else if (typeof C === 'string') {
      rendered = <C key={index} {...componentProps} />;
    } else if (typeof C === 'function') {
      rendered = <C key={index} areaProps={props} {...componentProps} />;
    }

    // Wrap widget entries with the page-builder chrome. `WidgetChrome`
    // returns its children unchanged outside the iframe, so this is safe
    // for production storefront. Pass `area` (the Area id rendering this
    // widget) so the toolbar can identify the correct placement when the
    // widget has placements in multiple areas. `sortOrder` powers the
    // `data-evershop-pb-sort-order` attribute that drop-zone DOM walks
    // read at drop time (`computeDropSortOrder`).
    if (rendered !== null && w._widgetMeta) {
      rendered = (
        <WidgetChrome
          key={index}
          uuid={w._widgetMeta.uuid}
          type={w._widgetMeta.type}
          area={id}
          editableInPageBuilder={editableInPageBuilder === true}
          sortOrder={Number(w.sortOrder ?? 0)}
          settings={w._widgetMeta.settings}
        >
          {rendered}
        </WidgetChrome>
      );
    } else if (rendered !== null && inPageBuilder) {
      // Non-widget renderables (layout components like ShoppingCart, plus
      // any `coreComponents`) get a tagged wrapper too — drop zones need
      // to be able to see them in sibling walks. `display: contents`
      // keeps the wrapper layout-transparent so flexbox/grid/tables don't
      // get a phantom child interfering. Only emitted in iframe mode;
      // production DOM is unaffected.
      rendered = (
        <div
          key={index}
          data-evershop-pb-sort-order={Number(w.sortOrder ?? 0)}
          style={{ display: 'contents' }}
        >
          {rendered}
        </div>
      );
    }

    if (!debug || rendered === null || process.env.NODE_ENV !== 'development') {
      return rendered;
    }

    return (
      <div
        key={index}
        className="evershop-debug-child"
        style={{
          position: 'relative',
          outline: `1px solid ${color}40`,
          outlineOffset: '1px'
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 9999,
            background: `${color}cc`,
            color: '#fff',
            fontSize: '9px',
            fontFamily: 'monospace',
            padding: '1px 5px',
            borderRadius: '0 0 0 4px',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          order: {w.sortOrder ?? 0}
        </span>
        {rendered}
      </div>
    );
  });

  // Drop zone above everything in the area, only emitted for areas the page
  // builder is allowed to edit. The component returns null outside the
  // iframe so production storefront DOM is unchanged. The zone computes its
  // own `sortOrder` at drop time by walking sibling DOM elements that carry
  // `data-evershop-pb-sort-order` — no prop threading needed.
  const startDropZone = editableInPageBuilder ? (
    <AreaStartDropZone areaId={id} />
  ) : null;

  if (process.env.NODE_ENV === 'development' && debug) {
    return (
      <WrapperComponent {...areaWrapperProps}>
        <span
          className="evershop-debug-area__badge"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 9999,
            background: color,
            color: '#fff',
            fontSize: '10px',
            fontFamily: 'monospace',
            padding: '1px 6px',
            borderRadius: '0 0 4px 0',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            cursor: 'default'
          }}
          title={`Area: #${id}`}
        >
          #{id}
        </span>
        {startDropZone}
        {renderedChildren}
      </WrapperComponent>
    );
  }

  return (
    <WrapperComponent {...areaWrapperProps}>
      {startDropZone}
      {renderedChildren}
    </WrapperComponent>
  );
}

export { Area };
export default Area;
