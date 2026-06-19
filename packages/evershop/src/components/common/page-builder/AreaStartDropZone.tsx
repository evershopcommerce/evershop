import React, { useEffect, useState } from 'react';
import { computeDropSortOrder } from './dropSortOrder.js';
import { isInPageBuilderIframe, postToParent } from './pageBuilderMode.js';

/**
 * Drop zone rendered as the first child of every Area marked
 * `editableInPageBuilder`. Gives the page-builder a way to drop above
 * everything in the area — including layout components like ShoppingCart
 * that aren't wrapped in `WidgetChrome` and therefore don't carry their own
 * after-widget drop zones.
 *
 * Reuses the `data-evershop-pb-dropzone` attribute and the existing CSS
 * rules in `WidgetChrome.tsx` for visibility (only shown while a drag is
 * in flight — `body[data-evershop-pb-drag="true"]`).
 *
 * The drop handler walks DOM siblings to find the nearest renderable's
 * `data-evershop-pb-sort-order` and computes a midpoint locally — see
 * `dropSortOrder.ts`. The admin just stores the computed value.
 *
 * SSR-safe: returns `null` outside the page-builder iframe so the production
 * storefront emits zero extra DOM.
 */
interface AreaStartDropZoneProps {
  areaId: string;
}

export function AreaStartDropZone({
  areaId
}: AreaStartDropZoneProps): React.ReactElement | null {
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
      data-evershop-pb-area-start={areaId}
      onDragEnter={onEnter}
      onDragLeave={onLeave}
      onDragOver={onOver}
      onDrop={onDrop}
    />
  );
}
