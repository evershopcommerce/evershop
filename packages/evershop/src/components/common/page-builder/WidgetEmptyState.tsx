import React, { useEffect, useState } from 'react';
import { isInPageBuilderIframe } from './pageBuilderMode.js';

/**
 * Shared in-editor placeholder for widgets that render nothing until they're
 * configured. On the live storefront an unconfigured widget should render
 * nothing (return null); but in the page-builder iframe that makes a freshly
 * dropped widget invisible and unselectable except via the Layers panel.
 *
 * Drop this in the widget's empty branch instead of `return null`:
 *
 *   if (rows.length === 0) {
 *     return <WidgetEmptyState type="text_block" title="Text block"
 *       hint="Open settings to add your copy." />;
 *   }
 *
 * It renders the dashed placeholder ONLY inside the page-builder iframe, and
 * only after mount — the first (SSR) render is `null` so it matches the
 * production storefront output and never trips hydration.
 */
export function WidgetEmptyState({
  type,
  title,
  hint,
  icon
}: {
  /** Widget type id — emitted as `data-evershop-pb-empty` for tooling. */
  type: string;
  title: string;
  hint: string;
  /** Optional custom glyph; defaults to a generic block icon. */
  icon?: React.ReactNode;
}): React.ReactElement | null {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isInPageBuilderIframe()) return null;

  return (
    <div
      className="evershop-widget-empty py-6"
      data-evershop-pb-empty={type}
    >
      <div className="mx-auto max-w-xl rounded-lg border-2 border-dashed border-divider bg-muted/30 p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-divider bg-background text-muted-foreground">
          {icon ?? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          )}
        </div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}
