import { useAppDispatch } from '@components/common/context/app.js';
import React, { useEffect, useRef } from 'react';
import {
  isInPageBuilderIframe,
  markPageBuilderActive
} from './pageBuilderMode.js';
import { ensureChromeStyleInjected } from './WidgetChrome.js';

/**
 * Listens for `data-update` postMessages from the admin window and applies
 * them to the iframe's `AppStateContext`. Race-safe via monotonic
 * `sequence` numbers — older responses are ignored when a newer one has
 * already been applied (per spec 03 § 7.3.4).
 *
 * Renders nothing. Mount once near the top of the iframe React tree (in
 * `Hydrate.tsx`) so it's always alive in page-builder mode.
 *
 * Same-origin requirement: messages from origins other than the iframe's
 * own origin are dropped.
 */

interface DataUpdateMessage {
  type: 'data-update';
  graphqlResponse?: Record<string, unknown>;
  propsMap?: Record<string, unknown[]>;
  /**
   * Page-builder widgets list (replaces context.widgets). Required when ops
   * add/remove widgets so `Area` re-evaluates which entries to render.
   */
  widgets?: unknown[];
  sequence?: number;
}

interface GlobalsViewMessage {
  type: 'globals-view';
  enabled: boolean;
}

const GLOBALS_OUTLINE_STYLE_ID = 'evershop-globals-outline-style';

/**
 * Walk the iframe's DOM and post the rendered widget UUIDs in DOM order to
 * the parent. The page-builder admin's Layers tab subscribes to this so
 * widgets list in the same order the storefront renders them — Area
 * positioning combined with per-area sort_order. Synthetic Areas inside
 * Columns containers naturally show their children in the right column
 * because `[data-evershop-pb-widget-uid]` matches both top-level widgets
 * and nested children alike.
 */
function reportWidgetOrder(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.parent === window) return;
  const order: string[] = [];
  const seen = new Set<string>();
  const nodes = document.querySelectorAll('[data-evershop-pb-widget-uid]');
  for (const node of Array.from(nodes)) {
    const uid = node.getAttribute('data-evershop-pb-widget-uid');
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    order.push(uid);
  }
  window.parent.postMessage(
    { type: 'preview-rendered', widgetOrder: order },
    window.location.origin
  );
}

function ensureGlobalsOutlineStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GLOBALS_OUTLINE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GLOBALS_OUTLINE_STYLE_ID;
  style.textContent = [
    'body[data-evershop-globals-view="1"] [data-evershop-global="true"] {',
    '  outline: 2px dashed #8b5cf6 !important;',
    '  outline-offset: 2px;',
    '  position: relative;',
    '}',
    'body[data-evershop-globals-view="1"] [data-evershop-global="true"]::before {',
    '  content: attr(data-evershop-area-id);',
    '  position: absolute;',
    '  top: 0;',
    '  left: 0;',
    '  z-index: 9998;',
    '  background: #8b5cf6;',
    '  color: #fff;',
    '  font-family: monospace;',
    '  font-size: 10px;',
    '  padding: 1px 6px;',
    '  border-radius: 0 0 4px 0;',
    '  pointer-events: none;',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

export function PageBuilderBridge(): null {
  const { setData, setFetching } = useAppDispatch();
  const lastSequence = useRef(0);

  useEffect(() => {
    if (!isInPageBuilderIframe()) return;
    markPageBuilderActive();

    ensureGlobalsOutlineStyle();
    // The chrome stylesheet carries the `[data-evershop-pb-dropzone]` sizing /
    // visibility rules. `WidgetChrome` injects it too, but only mounts per
    // existing widget — so on a route with no widgets the drop zones would
    // have no CSS and stay invisible / zero-height. Inject here (always
    // mounted in the iframe) so drop zones work on a fresh, empty store.
    ensureChromeStyleInjected();

    // Capture-phase link guard: edit mode disables in-preview navigation.
    // The page-builder session lives in the iframe's URL (`?changeset=`),
    // so following any <a href> would reload the iframe without the token
    // and silently deactivate every edit affordance — pageBuilderMode.ts
    // requires the param. Several widgets nest <Editable> text inside
    // anchors (BentoGrid tiles, Banner link-wrap), so a click meant to
    // start inline editing would otherwise also navigate. preventDefault
    // only — the click still bubbles to `onBodyClick` below so deselection
    // keeps working. `auxclick` covers middle-click, which would open the
    // tokenless URL in a new tab. Route switching stays the admin page
    // switcher's job.
    const onLinkActivate = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('a[href]')) e.preventDefault();
    };
    document.addEventListener('click', onLinkActivate, true);
    document.addEventListener('auxclick', onLinkActivate, true);

    // Bubble-phase body click: any click in the iframe is treated as
    // "click outside the active selection". The toolbar's Settings /
    // Delete buttons each call `event.stopPropagation()` before firing
    // their own postMessage, so they never reach this handler — only
    // those explicit clicks open the drawer; everything else (widget
    // body, links, canvas padding) closes it.
    const onBodyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !document.body.contains(target)) return;
      // Inside a drop zone → this is a page-builder affordance; don't
      // treat it as a deselection.
      if (target.closest('[data-evershop-pb-dropzone]')) return;
      // Any click in the iframe canvas dismisses the layer-hover state
      // applied via `layer-highlight` messages from the Layers panel.
      document
        .querySelectorAll('[data-evershop-pb-layer-hover="true"]')
        .forEach((el) => el.removeAttribute('data-evershop-pb-layer-hover'));
      window.parent?.postMessage(
        { type: 'pb-canvas-click' },
        window.location.origin
      );
    };
    document.addEventListener('click', onBodyClick);

    const handler = (event: MessageEvent) => {
      // Same-origin only.
      if (event.origin !== window.location.origin) return;
      const raw = event.data as
        | Partial<DataUpdateMessage>
        | Partial<GlobalsViewMessage>
        | null;
      if (!raw) return;

      // Drag lifecycle: the admin posts `pb-drag-start` / `pb-drag-end` when a
      // palette drag begins / ends. Toggling `body[data-evershop-pb-drag]`
      // reveals every drop zone via the chrome CSS. `WidgetChrome` also
      // listens, but only when a widget is mounted — handling it here too
      // makes drops work on a route with no widgets. Setting / removing the
      // attribute is idempotent, so both listeners firing is harmless.
      const dragType = (raw as { type?: string }).type;
      if (dragType === 'pb-drag-start') {
        document.body.setAttribute('data-evershop-pb-drag', 'true');
        return;
      }
      if (dragType === 'pb-drag-end') {
        document.body.removeAttribute('data-evershop-pb-drag');
        return;
      }

      // Globals-view toggle: outline `[data-evershop-global]` areas.
      if ((raw as GlobalsViewMessage).type === 'globals-view') {
        const enabled = !!(raw as GlobalsViewMessage).enabled;
        if (typeof document !== 'undefined') {
          if (enabled) {
            document.body.dataset.evershopGlobalsView = '1';
          } else {
            delete document.body.dataset.evershopGlobalsView;
          }
        }
        return;
      }

      // Preview-start: admin is about to push fresh data. Toggle the
      // storefront LoadingBar (driven by `useAppState().fetching`) so the
      // user sees the same progressive bar they see during client-side
      // navigation. We flip it off again when the corresponding
      // `data-update` lands below.
      if ((raw as { type?: string }).type === 'preview-start') {
        setFetching(true);
        return;
      }

      // Layer-highlight: the admin's Layers tab was clicked. Highlight the
      // matching widget in the iframe (same outline as :hover) and scroll
      // it into view. Doesn't open the settings drawer — that's the
      // toolbar Settings button's job. Cleared on body click below.
      if ((raw as { type?: string }).type === 'layer-highlight') {
        const targetUid = (raw as { widgetUid?: unknown }).widgetUid;
        document
          .querySelectorAll('[data-evershop-pb-layer-hover="true"]')
          .forEach((el) => el.removeAttribute('data-evershop-pb-layer-hover'));
        if (typeof targetUid === 'string' && targetUid.length > 0) {
          // CSS attribute selector requires the value to be quoted-safe;
          // widget uuids are v4 so the chars are alphanumeric+hyphen.
          const target = document.querySelector(
            `[data-evershop-pb-widget-uid="${targetUid}"]`
          );
          if (target) {
            target.setAttribute('data-evershop-pb-layer-hover', 'true');
            (target as HTMLElement).scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }
        return;
      }

      const msg = raw as Partial<DataUpdateMessage>;
      if (msg.type !== 'data-update') return;

      // Sequence-number race handling: ignore stale updates.
      if (typeof msg.sequence === 'number') {
        if (msg.sequence <= lastSequence.current) return;
        lastSequence.current = msg.sequence;
      }

      setFetching(false);

      setData((prev) => {
        const next = {
          ...prev,
          ...(msg.graphqlResponse !== undefined
            ? { graphqlResponse: msg.graphqlResponse as any }
            : {}),
          ...(msg.propsMap !== undefined
            ? { propsMap: msg.propsMap as any }
            : {}),
          ...(msg.widgets !== undefined
            ? { widgets: msg.widgets as any }
            : {})
        };
        // eslint-disable-next-line no-console
        console.log('[bridge] setData', {
          prevWidgets: (prev as any).widgets?.length,
          nextWidgets: (next as any).widgets?.length,
          seq: msg.sequence
        });
        return next;
      });

      // After React commits the new data, walk the iframe DOM and report
      // the rendered widget UUIDs in DOM order back to the parent. The
      // page-builder's Layers tab uses this to display widgets in the
      // same order the storefront actually paints them — Area positioning
      // (header → content → footer) plus per-area sort_order combined.
      // requestAnimationFrame waits one frame so React has flushed.
      requestAnimationFrame(() => {
        reportWidgetOrder();
      });
    };

    // Initial report on mount: SSR-rendered widgets are already in the DOM
    // by the time the bridge's effect runs. Send the order so Layers shows
    // the right list before the user makes any edit.
    requestAnimationFrame(() => {
      reportWidgetOrder();
    });

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('click', onBodyClick);
      document.removeEventListener('click', onLinkActivate, true);
      document.removeEventListener('auxclick', onLinkActivate, true);
    };
  }, [setData]);

  return null;
}
