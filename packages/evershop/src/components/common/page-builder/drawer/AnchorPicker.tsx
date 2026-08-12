import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * 9-anchor content position picker — a 3×3 dot grid where each cell maps
 * to a corner / edge / center anchor. Shared across the Slideshow,
 * Columns, and Banner setting drawers; storefront renderers each carry a
 * matching `ANCHOR_CLASS` map that converts the anchor to flex
 * `justify-*` + `items-*` + `text-*` classes.
 */

export type ContentAnchor =
  | 'tl'
  | 'tc'
  | 'tr'
  | 'ml'
  | 'mc'
  | 'mr'
  | 'bl'
  | 'bc'
  | 'br';

export const ANCHOR_CELLS: ReadonlyArray<ContentAnchor> = [
  'tl',
  'tc',
  'tr',
  'ml',
  'mc',
  'mr',
  'bl',
  'bc',
  'br'
];

export function AnchorPicker({
  value,
  onChange
}: {
  value: ContentAnchor;
  onChange: (v: ContentAnchor) => void;
}) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 rounded-md border border-divider bg-muted/30 p-2">
      {ANCHOR_CELLS.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`${_('Position')} ${c.toUpperCase()}`}
            title={c.toUpperCase()}
            className={`h-6 w-6 rounded transition-colors ${
              active
                ? 'bg-primary'
                : 'bg-card border border-divider hover:border-primary/40'
            }`}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full ${
                active ? 'bg-card' : 'bg-muted-foreground/60'
              } mx-auto`}
            />
          </button>
        );
      })}
    </div>
  );
}
