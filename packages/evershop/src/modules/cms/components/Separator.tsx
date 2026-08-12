import { isPageBuilderActive } from '@components/common/page-builder/index.js';
import React, { useEffect, useState } from 'react';

/**
 * Separator — vertical breathing room between widgets, with an optional
 * divider line. The size presets are pixel-doubling on a tight scale
 * (10→16→24→40→64); mobile values are roughly two-thirds of desktop so
 * narrow viewports don't waste a whole screen-height to whitespace.
 *
 * The widget always renders something on the live storefront — empty
 * spacing is the entire purpose. In the page-builder iframe we add a
 * faint dashed outline so the merchant can see and click on otherwise-
 * invisible space; that overlay is filtered out on the live store.
 */

export type SeparatorSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SeparatorProps {
  separatorWidget: {
    size: SeparatorSize | null;
    showLine: boolean | null;
    lineColor: string | null;
  };
}

// Tailwind py-* literals — JIT picks them up because the strings are
// fixed. Format: mobile / md+ desktop scale.
const SIZE_CLASS: Record<SeparatorSize, string> = {
  xs: 'py-1 md:py-2',
  sm: 'py-2 md:py-3',
  md: 'py-4 md:py-6',
  lg: 'py-6 md:py-10',
  xl: 'py-10 md:py-16'
};

export default function Separator({
  separatorWidget: { size, showLine, lineColor }
}: SeparatorProps) {
  // Page-builder dashed-outline hint — visible only inside the iframe so
  // merchants can see / click an otherwise-invisible spacer. SSR-stable:
  // first render is identical everywhere; the effect flips it on the
  // client only inside the page-builder.
  const [inPb, setInPb] = useState(false);
  useEffect(() => {
    setInPb(isPageBuilderActive());
  }, []);

  const sizeClass = SIZE_CLASS[size ?? 'md'] ?? SIZE_CLASS.md;
  const pbOutline = inPb
    ? 'outline-1 outline-dashed outline-foreground/10 outline-offset-[-1px]'
    : '';

  return (
    <div
      className={`evershop-separator w-full ${sizeClass} ${pbOutline}`}
      aria-hidden={showLine ? undefined : 'true'}
      role={showLine ? undefined : 'presentation'}
    >
      {showLine && (
        <hr
          className="evershop-separator__divider border-0 border-t"
          style={{
            borderColor: lineColor || undefined
          }}
        />
      )}
    </div>
  );
}

export const query = `
  query Query($size: String, $showLine: Boolean, $lineColor: String) {
    separatorWidget(size: $size, showLine: $showLine, lineColor: $lineColor) {
      size
      showLine
      lineColor
    }
  }
`;

export const variables = `{
  size: getWidgetSetting("size", "md"),
  showLine: getWidgetSetting("showLine", false),
  lineColor: getWidgetSetting("lineColor")
}`;
