import Area from '@components/common/Area.js';
import {
  isPageBuilderActive,
  useWidgetUid
} from '@components/common/page-builder/index.js';
import React, { useEffect, useState } from 'react';

export type ColumnAnchor =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br';

interface ColumnsProps {
  columnsWidget: {
    columnCount: number;
    gap: number;
    ratio?: string | null;
    background?: string | null;
    padding?: string | null;
    /** 9-anchor content alignment applied uniformly to every column. The
     *  inner Area is wrapped in a flex container; the anchor maps to
     *  `justify-*` (main axis) + `items-*` (cross axis) classes. */
    contentPosition?: ColumnAnchor | null;
  };
}

// Anchor → flex classes. Only `justify-*` (vertical / main axis) varies;
// `text-*` handles horizontal alignment of inner content. Cross-axis is
// left as the default `stretch` so child widgets keep their full column
// width — earlier `items-center` etc. collapsed widgets to content width,
// hiding empty / inline children behind their drop zones.
const ANCHOR_CLASS: Record<ColumnAnchor, string> = {
  tl: 'justify-start text-left',
  tc: 'justify-start text-center',
  tr: 'justify-start text-right',
  ml: 'justify-center text-left',
  mc: 'justify-center text-center',
  mr: 'justify-center text-right',
  bl: 'justify-end text-left',
  bc: 'justify-end text-center',
  br: 'justify-end text-right'
};

// Responsive padding presets — fixed string literals so Tailwind's JIT
// picks them up. Vertical scales faster than horizontal across breakpoints
// because hero-like rows usually want a tall band on desktop without
// crushing mobile viewports.
const PADDING_CLASS: Record<string, string> = {
  none: '',
  sm: 'py-3 px-3 md:py-4 md:px-4',
  md: 'py-5 px-4 md:py-7 md:px-6',
  lg: 'py-7 px-4 md:py-12 md:px-8',
  xl: 'py-10 px-4 md:py-16 md:px-12'
};

function parseRatio(
  ratio: string | null | undefined,
  fallbackCount: number
): { parts: number[]; gridCols: string } {
  const raw =
    typeof ratio === 'string' && ratio.length > 0
      ? ratio
      : Array.from({ length: Math.max(1, fallbackCount) }, () => '1').join('-');
  const parts = raw
    .split('-')
    .map((p) => Math.max(1, Math.min(6, Number(p) || 1)));
  return {
    parts,
    gridCols: parts.map((p) => `${p}fr`).join(' ')
  };
}

/**
 * Container widget. Renders one Area per column with synthetic id
 * `columnsContainer_<uid>_col_<index>`. `loadWidgetInstances` emits this
 * widget's children with matching `areaId` values, so child widgets
 * render inside their column via the standard Area mechanism.
 *
 * Layout knobs (all optional, sane fallbacks):
 *   - `ratio` — e.g. "1-1", "1-2-1". Drives column count + proportions.
 *     Falls back to evenly-split `columnCount` for back-compat with widgets
 *     saved before the ratio field existed.
 *   - `gap` — pixel gap between columns.
 *   - `background` — hex color applied to the row container.
 *   - `padding` — preset (`none|sm|md|lg|xl`) mapped to responsive
 *     Tailwind classes so mobile breakpoints don't crush the layout.
 *
 * Outside the page builder, `useWidgetUid` returns the widget's uuid via
 * the `WidgetContextProvider` mounted by `WidgetChrome` for every widget
 * (also outside the iframe — chrome's outer branch always wraps in
 * provider, no DOM overhead).
 */
export default function Columns({
  columnsWidget: {
    columnCount,
    gap,
    ratio,
    background,
    padding,
    contentPosition
  }
}: ColumnsProps) {
  const uid = useWidgetUid();
  // SSR-stable mode detection: first render passes through identically.
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  const safeGap = typeof gap === 'number' ? Math.max(0, Math.min(80, gap)) : 16;
  const { parts, gridCols } = parseRatio(ratio, columnCount || 2);
  const paddingClass = PADDING_CLASS[padding || 'none'] ?? '';
  const wrapperBg = background || undefined;
  const anchor = (contentPosition || 'mc') as ColumnAnchor;
  const anchorClass = ANCHOR_CLASS[anchor] ?? ANCHOR_CLASS.mc;

  if (!uid) return null;

  return (
    <div
      className={`evershop-columns ${paddingClass}`}
      style={{
        backgroundColor: wrapperBg,
        // When a background or padding is set, the row is the visual
        // container. Without either, render flush so the parent layout
        // controls spacing.
        width: '100%'
      }}
    >
      <div
        className="evershop-columns__grid"
        style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: `${safeGap}px`,
          width: '100%'
        }}
      >
        {parts.map((_, i) => (
          <div
            key={i}
            className={`evershop-columns__column flex flex-col ${anchorClass}`}
            data-evershop-pb-column-uid={uid}
            data-evershop-pb-column-index={i}
            style={{
              position: 'relative',
              // Outline only inside the page builder so the user can see
              // each column's bounds while dragging children in.
              ...(inPb
                ? {
                    minHeight: 80,
                    outline: '1px dashed rgba(0, 128, 95, 0.4)',
                    outlineOffset: -2,
                    padding: 8
                  }
                : null)
            }}
          >
            <Area
              id={`columnsContainer_${uid}_col_${i}`}
              noOuter
              editableInPageBuilder
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const query = `
  query Query(
    $columnCount: Int
    $gap: Float
    $ratio: String
    $background: String
    $padding: String
    $contentPosition: String
  ) {
    columnsWidget(
      columnCount: $columnCount
      gap: $gap
      ratio: $ratio
      background: $background
      padding: $padding
      contentPosition: $contentPosition
    ) {
      columnCount
      gap
      ratio
      background
      padding
      contentPosition
    }
  }
`;

export const variables = `{
  columnCount: getWidgetSetting("columnCount", 2),
  gap: getWidgetSetting("gap", 16),
  ratio: getWidgetSetting("ratio"),
  background: getWidgetSetting("background"),
  padding: getWidgetSetting("padding"),
  contentPosition: getWidgetSetting("contentPosition")
}`;
