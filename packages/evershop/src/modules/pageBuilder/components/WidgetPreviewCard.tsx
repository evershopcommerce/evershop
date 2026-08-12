import { getAreaComponents } from '@components/common/Area.js';
import { useAppState } from '@components/common/context/app.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { generateComponentKey } from '@evershop/evershop/lib/util/keyGenerator';
import React, { useMemo } from 'react';

interface PreviewableWidget {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
}

interface WidgetPreviewCardProps {
  widget: PreviewableWidget;
  /** Bounding rect of the widget row that triggered the hover. */
  rect: DOMRect;
  /** Right edge of the palette panel — the card sits just past it. */
  anchorX: number;
}

const CARD_W = 280;
const ESTIMATED_H = 220;

/**
 * Hover preview card surfaced by the Widgets palette. Renders a fixed-
 * positioned card beside the panel containing the widget's stylized preview
 * (registered via `Widget.previewComponent`, bundled by AreaLoader under
 * key `admin_widget_preview_<type>`) plus a caption with name/description.
 *
 * Doesn't go through `<Area>` because Area's lookup picks at most one
 * component per widget type (setting OR storefront) — adding a third
 * "preview" variant would invasively change Area's contract. Instead we
 * read the current route's wildcard map via `getAreaComponents(routeId)['*']`
 * and pull the preview component out of it.
 *
 * `pointer-events: none` so the card never blocks drag/click on the row.
 */
export function WidgetPreviewCard({
  widget,
  rect,
  anchorX
}: WidgetPreviewCardProps): React.ReactElement {
  const routeId = useAppState()?.config?.pageMeta?.route?.id;
  const PreviewComponent = useMemo(() => {
    const key = generateComponentKey(`admin_widget_preview_${widget.code}`);
    // Pull the preview component from the current route's wildcard ('*') map.
    // The page-builder editor route bundle registers every widget's preview there.
    const components = getAreaComponents(routeId);
    const wildcard = components?.['*'] ?? {};
    const entry = wildcard?.[key];
    const cmp = entry?.component?.default;
    return typeof cmp === 'function' || typeof cmp === 'object' ? cmp : null;
  }, [widget.code, routeId]);

  // Vertically center on the row, but clamp to viewport.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  let top = rect.top + rect.height / 2 - ESTIMATED_H / 2;
  top = Math.max(12, Math.min(top, vh - ESTIMATED_H - 12));

  return (
    <div
      style={{
        position: 'fixed',
        left: anchorX + 12,
        top,
        width: CARD_W,
        zIndex: 1300,
        pointerEvents: 'none',
        animation: 'pbWidgetPreviewFade 120ms ease-out'
      }}
      className="bg-card border border-divider rounded-md shadow-lg overflow-hidden"
    >
      <div className="bg-muted/30 border-b border-divider">
        {PreviewComponent ? (
          // Cast to a generic React element — the registry guarantees it's a
          // component-like value, but TS doesn't know the exact shape.
          React.createElement(
            PreviewComponent as React.ComponentType<Record<string, never>>,
            {}
          )
        ) : (
          <div className="py-8 px-4 text-center text-xs text-muted-foreground font-mono">
            {widget.code}
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="text-[13px] font-semibold text-foreground">
          {_(widget.name)}
        </div>
        {widget.description && (
          <div className="text-[11.5px] text-muted-foreground mt-1 leading-snug">
            {_(widget.description)}
          </div>
        )}
        <div className="mt-2 text-[10.5px] text-muted-foreground/80 font-mono flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/60" />
          {_('Click or drag to add')}
        </div>
      </div>
    </div>
  );
}

/**
 * Inject the fade-in keyframes once. Idempotent — checks for an existing
 * `<style>` tag before appending. Runs at module load on the client.
 */
if (
  typeof document !== 'undefined' &&
  !document.getElementById('pb-widget-preview-anim')
) {
  const s = document.createElement('style');
  s.id = 'pb-widget-preview-anim';
  s.textContent =
    '@keyframes pbWidgetPreviewFade { from { opacity: 0; transform: translateX(-4px); } to { opacity: 1; transform: translateX(0); } }';
  document.head.appendChild(s);
}
