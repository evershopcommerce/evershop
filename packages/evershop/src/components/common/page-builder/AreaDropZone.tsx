import React, { useEffect, useState } from 'react';
import { computeDropSortOrder } from './dropSortOrder.js';
import { isInPageBuilderIframe, postToParent } from './pageBuilderMode.js';

/**
 * The page builder's drop seam. `Area.tsx` owns every instance: one as the
 * first child of each Area marked `editableInPageBuilder`
 * (`variant="start"`), and one after every renderable in such an Area —
 * widget instances and layout components alike. That makes each gap in the
 * rendered order a drop target: above everything, between any two
 * renderables (widget-widget, widget-layout, layout-layout), and below the
 * last one.
 *
 * Visibility and styling come from the `[data-evershop-pb-dropzone]` rules
 * in the chrome stylesheet (`ensureChromeStyleInjected` in
 * `WidgetChrome.tsx`, guaranteed by `PageBuilderBridge` even on routes with
 * zero widgets): zones are zero-height and inert until the admin posts
 * `pb-drag-start`, which sets `body[data-evershop-pb-drag="true"]`.
 *
 * The drop handler walks DOM siblings to find the nearest renderables'
 * `data-evershop-pb-sort-order` and computes a midpoint locally — see
 * `dropSortOrder.ts`. The admin just stores the computed value.
 *
 * SSR-safe: returns `null` outside the page-builder iframe so the production
 * storefront emits zero extra DOM.
 */
interface AreaDropZoneProps {
  areaId: string;
  /**
   * 'start' — the zone above everything in the area (Area's first child),
   * tagged `data-evershop-pb-area-start` for e2e / debugging.
   * 'after' (default) — the zone following one renderable.
   */
  variant?: 'start' | 'after';
  /**
   * uuid of the widget instance this zone follows, when it follows one.
   * Surfaced as `data-evershop-pb-after` — an e2e / debugging hook only;
   * the drop math never reads it. Zones after layout components have no
   * uuid and omit the attribute.
   */
  afterUid?: string;
}

export function AreaDropZone({
  areaId,
  variant = 'after',
  afterUid
}: AreaDropZoneProps): React.ReactElement | null {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient || !isInPageBuilderIframe()) return null;

  const onEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('application/x-evershop-widget')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    (e.currentTarget as HTMLDivElement).setAttribute(
      'data-evershop-pb-active',
      'true'
    );
  };
  const onLeave = (e: React.DragEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).removeAttribute(
      'data-evershop-pb-active'
    );
  };
  const onOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('application/x-evershop-widget')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const widgetType =
      e.dataTransfer.getData('application/x-evershop-widget') ||
      e.dataTransfer.getData('text/plain');
    if (!widgetType) return;
    const zone = e.currentTarget as HTMLDivElement;
    zone.removeAttribute('data-evershop-pb-active');
    document.body.removeAttribute('data-evershop-pb-drag');
    const sortOrder = computeDropSortOrder(zone);
    // Detect whether the drop landed in a global area (header, footer,
    // anywhere wrapped by `<Area isGlobal>`). The admin uses this to
    // default the new placement to `route='all'` so the widget shows on
    // every page — same as a header/footer would intuitively behave.
    const isGlobal = !!zone.closest('[data-evershop-global="true"]');
    postToParent({
      type: 'pb-drop',
      widgetType,
      area: areaId,
      sortOrder,
      isGlobal
    });
  };

  return (
    <div
      data-evershop-pb-dropzone
      data-evershop-pb-area={areaId}
      {...(variant === 'start'
        ? { 'data-evershop-pb-area-start': areaId }
        : {})}
      {...(afterUid ? { 'data-evershop-pb-after': afterUid } : {})}
      onDragEnter={onEnter}
      onDragLeave={onLeave}
      onDragOver={onOver}
      onDrop={onDrop}
    />
  );
}
