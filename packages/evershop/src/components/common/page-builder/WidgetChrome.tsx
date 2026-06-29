import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useState } from 'react';
import { computeDropSortOrder } from './dropSortOrder.js';
import { isInPageBuilderIframe, postToParent } from './pageBuilderMode.js';
import { WidgetContextProvider } from './WidgetContext.js';

const CHROME_STYLE_ID = 'evershop-pb-chrome-style';
const CHROME_CSS = `
  [data-evershop-pb-widget-uid] { transition: outline-color 0.12s ease; outline: 2px solid transparent; outline-offset: -2px; }
  [data-evershop-pb-widget-uid]:hover { outline-color: rgba(0, 128, 95, 0.45); }
  [data-evershop-pb-widget-uid][data-evershop-pb-selected="true"] { outline-color: rgba(0, 128, 95, 0.95); }
  /* Set by PageBuilderBridge on receipt of a 'layer-highlight' message —
     clicking a row in the admin's Layers tab highlights the matching widget
     in the iframe and scrolls it into view. Same outline color as :hover so
     the affordance reads identically. Cleared on body click. */
  [data-evershop-pb-widget-uid][data-evershop-pb-layer-hover="true"] {
    outline-color: rgba(0, 128, 95, 0.45);
  }
  [data-evershop-pb-widget-uid] > [data-evershop-pb-toolbar] {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
  }
  [data-evershop-pb-widget-uid]:hover > [data-evershop-pb-toolbar],
  [data-evershop-pb-widget-uid][data-evershop-pb-selected="true"] > [data-evershop-pb-toolbar],
  [data-evershop-pb-widget-uid][data-evershop-pb-layer-hover="true"] > [data-evershop-pb-toolbar] {
    opacity: 1;
    pointer-events: auto;
  }

  /* Drop zones — visible only while a page-builder drag is in flight. The
     ::before pseudo-element renders a corner badge with the area id, sourced
     from the zone's data-evershop-pb-area attribute. Page-scoped areas use
     the editor's accent green; global areas (data-evershop-global) flip to
     violet, matching the demo's "globals are violet" convention. */
  [data-evershop-pb-dropzone] {
    position: relative;
    margin: 0;
    background: transparent;
    border-radius: 4px;
    transition: background 0.12s ease, height 0.12s ease, margin 0.12s ease;
    pointer-events: none;
  }
  body[data-evershop-pb-drag="true"] [data-evershop-pb-dropzone] {
    height: 32px;
    margin: 6px 0;
    background: rgba(0, 128, 95, 0.10);
    border: 2px dashed rgba(0, 128, 95, 0.35);
    pointer-events: auto;
  }
  body[data-evershop-pb-drag="true"] [data-evershop-pb-dropzone][data-evershop-pb-active="true"] {
    background: rgba(0, 128, 95, 0.25);
    border-color: rgba(0, 128, 95, 0.85);
  }
  /* Area-id badge in the top-left corner of each drop zone, only when a
     drag is in flight. */
  body[data-evershop-pb-drag="true"] [data-evershop-pb-dropzone][data-evershop-pb-area]::before {
    content: attr(data-evershop-pb-area);
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    padding: 2px 6px;
    background: #00805f;
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    border-radius: 0 0 4px 0;
    pointer-events: none;
    line-height: 1;
  }
  /* Global-area variant: same shape, violet palette. Descendant selector
     piggybacks on Area's data-evershop-global attribute so no extra prop
     threading is needed — drop zones inside global Areas (header / footer /
     etc.) get the violet treatment automatically. */
  body[data-evershop-pb-drag="true"] [data-evershop-global="true"] [data-evershop-pb-dropzone] {
    background: rgba(124, 58, 237, 0.10);
    border-color: rgba(124, 58, 237, 0.35);
  }
  body[data-evershop-pb-drag="true"] [data-evershop-global="true"] [data-evershop-pb-dropzone][data-evershop-pb-active="true"] {
    background: rgba(124, 58, 237, 0.25);
    border-color: rgba(124, 58, 237, 0.85);
  }
  body[data-evershop-pb-drag="true"] [data-evershop-global="true"] [data-evershop-pb-dropzone][data-evershop-pb-area]::before {
    background: #7c3aed;
  }
`;

/**
 * Inject the page-builder chrome stylesheet (widget outlines, toolbar
 * visibility, and — critically — the `[data-evershop-pb-dropzone]` sizing /
 * visibility rules) once per document. Idempotent via the element-id guard.
 *
 * Exported because the drop-zone rules must exist even on a route with **no
 * widgets** (a fresh store): `WidgetChrome` only mounts per existing widget,
 * so `PageBuilderBridge` (always mounted in the iframe) also calls this to
 * guarantee the stylesheet is present regardless of widget count.
 */
export function ensureChromeStyleInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(CHROME_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = CHROME_STYLE_ID;
  el.textContent = CHROME_CSS;
  document.head.appendChild(el);
}

// Tiny SVG icon set inlined so the iframe doesn't need to load lucide.
// Sizes are fixed at 14px to match the demo's toolbar density.
function ArrowUpIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
function ArrowDownIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function CopyIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}
function SettingsIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}
function TrashIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

const TONE_COLOR: Record<'neutral' | 'accent' | 'danger', string> = {
  neutral: 'hsl(215, 16%, 32%)',
  accent: '#00805f',
  danger: '#e53935'
};

function ChromeIconButton({
  label,
  tone = 'neutral',
  onClick,
  children
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'danger';
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 26,
        height: 26,
        border: 0,
        background: 'transparent',
        borderRadius: 4,
        cursor: 'pointer',
        color: TONE_COLOR[tone],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'hsl(210, 16%, 96%)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

/**
 * Wraps each widget render in the page-builder iframe with selection
 * affordances and a hover toolbar (Settings / Delete). Outside the iframe
 * (production storefront), it renders `children` unchanged with no extra
 * markup or context — zero overhead.
 *
 * Selection / delete are delivered to the admin via same-origin postMessage:
 *   - { type: 'widget-selected', widgetUid, widgetType, settings }
 *   - { type: 'widget-delete',   widgetUid }
 *
 * The admin (`Editor.tsx`) listens and dispatches drawer / DELETE-op flows.
 */

interface WidgetChromeProps {
  uuid: string;
  type: string;
  /**
   * The Area id this widget render is attached to. A single widget can have
   * multiple placements across areas; the toolbar messages include this so
   * the admin handler operates on the right placement.
   */
  area: string;
  /**
   * Whether the containing Area opted into page-builder editing
   * (`<Area editableInPageBuilder>`). When false, the after-widget drop
   * zone is suppressed so this widget's area-level container respects its
   * non-editable contract — selection/toolbar still render (they let the
   * user inspect/configure existing widgets) but new drops are not allowed.
   * `AreaStartDropZone` is gated the same way on the Area side.
   */
  editableInPageBuilder: boolean;
  /**
   * The placement's sort_order. Surfaced as `data-evershop-pb-sort-order`
   * on the wrapper so adjacent drop zones can walk DOM siblings and read
   * the value when computing where a new drop should land.
   */
  sortOrder: number;
  settings: Record<string, unknown>;
  children: React.ReactNode;
}

export function WidgetChrome({
  uuid,
  type,
  area,
  editableInPageBuilder,
  sortOrder,
  settings,
  children
}: WidgetChromeProps): React.ReactElement {
  // SSR-stable: first render passes through identically to production.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const inIframe = isClient && isInPageBuilderIframe();

  // Inject the chrome stylesheet ONCE per document instead of per widget.
  // Also subscribe to drag-start/drag-end messages from the admin so drop
  // zones in the document can react via the body[data-evershop-pb-drag]
  // attribute (CSS handles the visual states).
  useEffect(() => {
    if (!inIframe) return;
    ensureChromeStyleInjected();
    const onMsg = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data: any = event.data;
      if (!data) return;
      if (data.type === 'pb-drag-start') {
        document.body.setAttribute('data-evershop-pb-drag', 'true');
      } else if (data.type === 'pb-drag-end') {
        document.body.removeAttribute('data-evershop-pb-drag');
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [inIframe]);

  if (!inIframe) {
    // Production / non-page-builder: just provide widget context (cheap, no DOM).
    return (
      <WidgetContextProvider uid={uuid} settings={settings}>
        {children}
      </WidgetContextProvider>
    );
  }

  const handleDropZoneEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('application/x-evershop-widget')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    (e.currentTarget as HTMLDivElement).setAttribute(
      'data-evershop-pb-active',
      'true'
    );
  };
  const handleDropZoneLeave = (e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).removeAttribute(
      'data-evershop-pb-active'
    );
  };
  const handleDropZoneOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('application/x-evershop-widget')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDropAfter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const widgetType =
      e.dataTransfer.getData('application/x-evershop-widget') ||
      e.dataTransfer.getData('text/plain');
    if (!widgetType) return;
    const zone = e.currentTarget as HTMLDivElement;
    zone.removeAttribute('data-evershop-pb-active');
    document.body.removeAttribute('data-evershop-pb-drag');
    // Iframe owns the math. Walk siblings to find prev/next sort_orders
    // (both widgets and layout components carry the attribute) and post
    // the pre-computed value to the admin.
    const sortOrder = computeDropSortOrder(zone);
    const isGlobal = !!zone.closest('[data-evershop-global="true"]');
    postToParent({
      type: 'pb-drop',
      widgetType,
      area,
      sortOrder,
      isGlobal
    });
  };

  return (
    <WidgetContextProvider uid={uuid} settings={settings}>
      <div
        className="evershop-pb-widget"
        data-evershop-pb-widget-uid={uuid}
        data-evershop-pb-sort-order={sortOrder}
        style={{
          position: 'relative'
        }}
      >
        {children}
        <div
          className="evershop-pb-widget__toolbar"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 2,
            padding: 3,
            zIndex: 9999,
            background: '#ffffff',
            border: '1px solid hsl(214, 15%, 91%)',
            borderRadius: 6,
            boxShadow:
              '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
            fontFamily:
              "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          }}
          data-evershop-pb-toolbar
        >
          <ChromeIconButton
            label={_('Move up')}
            onClick={() =>
              postToParent({ type: 'widget-move-up', widgetUid: uuid, area })
            }
          >
            <ArrowUpIcon />
          </ChromeIconButton>
          <ChromeIconButton
            label={_('Move down')}
            onClick={() =>
              postToParent({ type: 'widget-move-down', widgetUid: uuid, area })
            }
          >
            <ArrowDownIcon />
          </ChromeIconButton>
          <ChromeIconButton
            label={_('Duplicate')}
            onClick={() =>
              postToParent({ type: 'widget-duplicate', widgetUid: uuid, area })
            }
          >
            <CopyIcon />
          </ChromeIconButton>
          <ChromeIconButton
            label={_('Settings')}
            tone="accent"
            onClick={() =>
              postToParent({
                type: 'widget-selected',
                widgetUid: uuid,
                widgetType: type,
                settings
              })
            }
          >
            <SettingsIcon />
          </ChromeIconButton>
          <ChromeIconButton
            label={_('Delete')}
            tone="danger"
            onClick={() =>
              postToParent({
                type: 'widget-delete',
                widgetUid: uuid,
                widgetType: type
              })
            }
          >
            <TrashIcon />
          </ChromeIconButton>
        </div>
      </div>
      {/* Drop zone immediately AFTER this widget. Gated on
          `editableInPageBuilder` so a widget rendered inside an Area that
          opted out of page-builder editing doesn't expose a drop affordance.
          (Selection / toolbar above still render — they only inspect /
          configure / delete the existing widget, which is safe.) Visible
          only when the body has `data-evershop-pb-drag="true"` (set by the
          message handler above). `data-evershop-pb-area` powers the corner
          badge CSS, `computeDropSortOrder` walks siblings at drop time. */}
      {editableInPageBuilder && (
        <div
          data-evershop-pb-dropzone
          data-evershop-pb-area={area}
          data-evershop-pb-after={uuid}
          onDragEnter={handleDropZoneEnter}
          onDragLeave={handleDropZoneLeave}
          onDragOver={handleDropZoneOver}
          onDrop={handleDropAfter}
        />
      )}
    </WidgetContextProvider>
  );
}
