
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Compact color picker — preset swatch grid + native `<input type="color">` +
 * free-text CSS color string. Outputs a CSS color value as a string. Empty
 * string is allowed and represents "no color" (transparent/inherit).
 *
 * Used by widgets that need a small, opinionated color choice (announcement
 * bar background, coupon block fill, columns row background). Not a
 * replacement for a full design-token picker — those belong elsewhere.
 */

export interface ColorSwatch {
  value: string;
  label: string;
}

export interface ColorSwatchFieldProps {
  value: string;
  onChange: (next: string) => void;
  swatches?: ReadonlyArray<ColorSwatch>;
  /** When provided, the first entry's value is treated as "no color". */
  allowEmpty?: boolean;
  /** Hide the native color input + hex text row underneath the swatches. */
  hideCustom?: boolean;
}

export const DEFAULT_SWATCHES: ReadonlyArray<ColorSwatch> = [
  { value: '', label: _('None') },
  { value: '#ffffff', label: _('White') },
  { value: '#f7f7f7', label: _('Light gray') },
  { value: '#111827', label: _('Charcoal') },
  { value: '#000000', label: _('Black') },
  { value: '#fef3c7', label: _('Cream') },
  { value: '#dbeafe', label: _('Sky') },
  { value: '#dcfce7', label: _('Mint') }
];

export function ColorSwatchField({
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
  allowEmpty = true,
  hideCustom = false
}: ColorSwatchFieldProps) {
  const swatchList = allowEmpty
    ? swatches
    : swatches.filter((s) => s.value !== '');
  const isCustom =
    !!value && !swatchList.some((s) => s.value === value);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {swatchList.map((s) => {
          const active = (value || '') === s.value;
          return (
            <button
              key={s.value || 'none'}
              type="button"
              onClick={() => onChange(s.value)}
              title={s.label}
              aria-pressed={active}
              className={`relative flex h-8 items-center justify-center rounded-md border text-[10px] transition-all ${
                active
                  ? 'ring-2 ring-primary/60 border-primary/60'
                  : 'border-divider hover:border-foreground/30'
              }`}
              style={
                s.value
                  ? { backgroundColor: s.value }
                  : {
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,0.06) 4px 8px)'
                    }
              }
            >
              <span
                className={`rounded px-1 ${
                  s.value
                    ? 'bg-black/40 text-white'
                    : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
      {!hideCustom && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={isCustom ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-divider bg-transparent"
          />
          <input
            type="text"
            value={isCustom ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 rounded-md border border-divider bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
