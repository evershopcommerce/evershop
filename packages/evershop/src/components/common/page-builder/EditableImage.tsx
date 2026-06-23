import { ImagePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { isPageBuilderActive, postToParent } from './pageBuilderMode.js';
import { useWidgetUid } from './WidgetContext.js';

/**
 * Maps one image "version" to the widget-settings keys it writes. The picker
 * sets `urlField` to the chosen image and, if provided, `widthField`/
 * `heightField` to the image's natural dimensions (captured admin-side).
 * Paths are relative to the widget, e.g. "settings.src" or
 * "settings.slides.0.mobileImage".
 */
export interface ImageFieldMapping {
  urlField: string;
  widthField?: string;
  heightField?: string;
}

function postEditImage(
  widgetUid: string | null,
  fields: ImageFieldMapping,
  e: React.MouseEvent
) {
  e.preventDefault();
  e.stopPropagation();
  postToParent({ type: 'edit-image', widgetUid, fields });
}

/**
 * The hover affordance itself — a dimmed `absolute inset-0` layer with one
 * ("Replace image" / "Add image") or two ("Desktop" / "Mobile") pick buttons.
 * The PARENT must be `group relative` (the EditableImage wrapper, or a widget
 * tile/slide). `zClass` lifts it above any content layered on the image.
 */
function EditOverlay({
  widgetUid,
  desktop,
  mobile,
  empty,
  zClass
}: {
  widgetUid: string | null;
  desktop: ImageFieldMapping;
  mobile?: ImageFieldMapping;
  empty?: boolean;
  zClass: string;
}): React.ReactElement {
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${zClass} flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100`}
    >
      <button
        type="button"
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium text-gray-900 shadow hover:bg-white"
        onClick={(e) => postEditImage(widgetUid, desktop, e)}
      >
        <ImagePlus className="h-4 w-4" />
        {mobile ? 'Desktop' : empty ? 'Add image' : 'Replace image'}
      </button>
      {mobile && (
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium text-gray-900 shadow hover:bg-white"
          onClick={(e) => postEditImage(widgetUid, mobile, e)}
        >
          <ImagePlus className="h-4 w-4" />
          Mobile
        </button>
      )}
    </div>
  );
}

interface EditableImageProps {
  /** Desktop / default image target. */
  desktop: ImageFieldMapping;
  /**
   * Optional mobile-variant target. When set, the overlay offers a second
   * "Mobile" action — so a merchant can replace the mobile image, or ADD one
   * even when the slot currently falls back to the desktop image.
   */
  mobile?: ImageFieldMapping;
  /** Extra classes for the positioning wrapper (page-builder canvas only). */
  className?: string;
  /**
   * The slot has no image yet. On the live storefront this renders nothing; in
   * the page-builder canvas it renders a clickable placeholder so the first
   * image can be added inline (not only replaced).
   */
  empty?: boolean;
  /** The real image markup — `<Image>`, a `<picture>`, or banner's dual
   *  CSS-toggled `<Image>`s. Rendered untouched on the live storefront. */
  children?: React.ReactNode;
}

/**
 * Inline-edit affordance that WRAPS a standalone image slot (banner,
 * split-feature, product-hero, collection-spotlight, brand-story). On the live
 * storefront it's a no-op passthrough (`display: contents`).
 *
 * For widgets whose image is a full-bleed background with content layered on
 * top (bento tiles, category mosaic, slideshow), use `EditableImageOverlay`
 * instead — it drops the same affordance ABOVE the content without wrapping.
 *
 * The picker can't live in the iframe (it needs the admin session/GraphQL), so
 * clicking a target posts an `edit-image` message; the admin shell opens the
 * FileBrowser and writes the result back through the page-level form — the same
 * bridge `<Editable>` uses for text.
 */
export function EditableImage({
  desktop,
  mobile,
  className,
  empty = false,
  children
}: EditableImageProps): React.ReactElement | null {
  // Defer page-builder detection until after mount so the first render matches
  // SSR (mirrors `<Editable>`).
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const widgetUid = useWidgetUid();
  const inPb = isClient && isPageBuilderActive() && !!widgetUid;

  // Empty slot outside the builder: render nothing (no placeholder leaks onto
  // the live storefront). Inside the builder it falls through to the
  // placeholder below.
  if (empty && !inPb) {
    return null;
  }

  const body = empty ? (
    <div className="evershop-editable-image__placeholder flex h-full min-h-32 w-full items-center justify-center border-2 border-dashed border-foreground/15 bg-muted/30 text-muted-foreground">
      <ImagePlus className="h-6 w-6" />
    </div>
  ) : (
    children
  );

  // Same wrapper element in both modes (no image remount). Production:
  // `display: contents` → zero layout impact. Canvas: a relative box hosting
  // the hover overlay.
  return (
    <div
      className={
        inPb
          ? `evershop-editable-image group relative ${className ?? ''}`
          : 'evershop-editable-image'
      }
      style={inPb ? undefined : { display: 'contents' }}
    >
      {body}
      {inPb && (
        <EditOverlay
          widgetUid={widgetUid}
          desktop={desktop}
          mobile={mobile}
          empty={empty}
          zClass="z-10"
        />
      )}
    </div>
  );
}

interface EditableImageOverlayProps {
  desktop: ImageFieldMapping;
  mobile?: ImageFieldMapping;
  /** True when the slot has no image yet — switches the label to "Add image". */
  empty?: boolean;
}

/**
 * Drop-in inline-edit overlay for widgets whose image is a full-bleed
 * background with content layered on top (bento tiles, category mosaic,
 * tiered categories, slideshow). Render it as the LAST child of a
 * `group relative` container; it shows the same hover affordance ABOVE the
 * content (z-30) and renders nothing on the live storefront.
 */
export function EditableImageOverlay({
  desktop,
  mobile,
  empty = false
}: EditableImageOverlayProps): React.ReactElement | null {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const widgetUid = useWidgetUid();
  const inPb = isClient && isPageBuilderActive() && !!widgetUid;
  if (!inPb) return null;

  return (
    <EditOverlay
      widgetUid={widgetUid}
      desktop={desktop}
      mobile={mobile}
      empty={empty}
      zClass="z-30"
    />
  );
}
