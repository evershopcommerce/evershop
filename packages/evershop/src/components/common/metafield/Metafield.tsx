import { useAppState } from '@components/common/context/app.js';
import {
  isInPageBuilderIframe,
  postToParent
} from '@components/common/page-builder/pageBuilderMode.js';
import React, { useEffect, useState } from 'react';
import {
  resolveMetafield,
  type MetafieldMeta,
  type ShapedMetafieldEntry
} from './resolveMetafield.js';

export interface MetafieldProps {
  /** Owner entity type — 'product' | 'category' | 'collection' | 'customer'
   *  | 'order' | 'shop' | 'blog_post' | 'blog_category' (open set). */
  owner: string;
  namespace: string;
  fieldKey: string;
  /**
   * The entity carrying `metafields` — ALWAYS provided by the developer
   * (owner decision 2026-07-18: the component never fetches or reads entity
   * contexts itself). On productView: `const product = useProduct()` and pass
   * it; in grids/shelves: the card's item; for shop: the `setting` object
   * from the enclosing master's query. Nullish is tolerated at runtime (the
   * default renders) so loading/optional data doesn't crash.
   */
  entity:
    | { uuid?: string; metafields?: ShapedMetafieldEntry[] }
    | null
    | undefined;
  /** Per-call-site override; the manifest's appearance.placeholder is the
   *  primary default source (design Decision 5). Render-side only. */
  defaultValue?: unknown;
  render?: (value: unknown, meta: MetafieldMeta) => React.ReactNode;
  /** Fast path for plain scalar text when no render prop is given. */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

const devWarn = (message: string) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(message);
  }
};

/* Page-builder chrome — injected once per document, active only inside the
 * PB iframe. Violet dashed hover outline + a "Live data" tag, visually
 * distinct from the widget chrome so staged-vs-live stays legible. */
const MF_STYLE_ID = 'evershop-metafield-chrome-style';
const MF_CSS = `
[data-evershop-mf]{position:relative;outline:1px dashed transparent;outline-offset:2px;cursor:pointer}
[data-evershop-mf]:hover{outline-color:#7c3aed}
[data-evershop-mf]:hover::after{content:attr(data-evershop-mf-label);position:absolute;top:-20px;left:0;background:#7c3aed;color:#fff;font-size:10px;line-height:1.4;padding:1px 6px;border-radius:3px;white-space:nowrap;z-index:60}
[data-evershop-mf-ghost]{display:inline-block;border:1px dashed #a78bfa;color:#7c3aed;background:#f5f3ff;font-size:11px;line-height:1.4;padding:2px 8px;border-radius:4px;cursor:pointer}
`;

function ensureChromeStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MF_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = MF_STYLE_ID;
  style.textContent = MF_CSS;
  document.head.appendChild(style);
}

/**
 * Storefront metafield renderer (theme-metafields design § V1b + § V1.1).
 *
 * Purely presentational: the developer supplies the entity (with its
 * `metafields` selection from the page's merged GraphQL query) — the
 * component performs no fetching and reads no entity contexts. Its only
 * ambient input is the manifest-descriptor projection in app context (the
 * theme's DECLARATION, not entity data — per-call-site descriptors would
 * reintroduce the dual-declaration drift the manifest killed). Declared
 * `visibleToCustomer: false` fields render NOTHING — never the default.
 *
 * Page-builder mode (V1.1): after hydration inside the PB iframe the
 * rendered value gains hover chrome; clicking posts a `metafield-select`
 * message to the admin shell, which opens the guideline drawer (info +
 * definition status + deep link — values are LIVE data and are never edited
 * from the builder). Declared fields that render nothing on the storefront
 * (hidden, or unset without a default) show a ghost chip instead so they
 * stay discoverable in the canvas. The first render is always the bare
 * production element (Editable's two-phase pattern — SSR-stable).
 */
export function Metafield({
  owner,
  namespace,
  fieldKey,
  entity,
  defaultValue,
  render,
  as: Tag = 'span',
  className
}: MetafieldProps) {
  const app = useAppState();
  // Two-phase PB detection (Editable.tsx pattern): the first render matches
  // SSR; chrome mounts after hydration, only inside the PB iframe.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const inIframe = isClient && isInPageBuilderIframe();
  useEffect(() => {
    if (inIframe) ensureChromeStyle();
  }, [inIframe]);

  const ref = `${owner}.${namespace}.${fieldKey}`;
  const descriptor = app?.config?.themeMetafieldDescriptors?.[ref];
  const entries = entity?.metafields;
  const entry = Array.isArray(entries)
    ? entries.find((m) => m && m.namespace === namespace && m.key === fieldKey)
    : undefined;

  const resolution = resolveMetafield({
    ref,
    descriptor,
    entry,
    defaultValue
  });

  if ('warn' in resolution && resolution.warn) devWarn(resolution.warn);

  const select = () =>
    postToParent({
      type: 'metafield-select',
      ownerType: owner,
      ownerUuid: entity?.uuid,
      namespace,
      fieldKey,
      value: entry?.value ?? null,
      declared: descriptor ?? null,
      resolutionKind: resolution.kind
    });

  if (resolution.kind === 'hidden' || resolution.kind === 'empty') {
    // Declared fields stay discoverable in the builder via a ghost chip;
    // the storefront (and the SSR first render) shows nothing.
    if (inIframe && descriptor) {
      return (
        <span
          data-evershop-mf-ghost=""
          role="button"
          tabIndex={0}
          onClick={(e) => {
            // Stop the bridge's canvas-click deselection from racing the
            // selection message (it would close the drawer we just opened).
            e.preventDefault();
            e.stopPropagation();
            select();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              select();
            }
          }}
        >
          {descriptor.name ?? fieldKey}
        </span>
      );
    }
    return null;
  }

  const { value, meta } = resolution;
  let rendered: React.ReactNode = null;
  if (render) {
    rendered = render(value, meta);
  } else if (typeof value === 'string' || typeof value === 'number') {
    // Default renderer covers plain scalars only; lists, groups, booleans and
    // rich_text need a render prop (keeps this component's bundle cost near
    // zero — the rich_text Row[] renderer is @components/common/Editor.js).
    rendered = <Tag className={className}>{String(value)}</Tag>;
  } else {
    devWarn(
      `<Metafield> "${ref}": non-scalar value needs a render prop — rendered nothing`
    );
  }

  if (!inIframe || rendered === null) {
    return <>{rendered}</>;
  }
  // Chrome wrapper: capture-phase click so links/buttons inside a render prop
  // never navigate the preview away (the PB link guard's rule) — selecting
  // the field is the only click behavior in the canvas.
  return (
    <span
      data-evershop-mf=""
      data-evershop-mf-label={`Live data: ${descriptor?.name ?? fieldKey}`}
      onClickCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        select();
      }}
    >
      {rendered}
    </span>
  );
}
