import {
  drawerInputClass,
  Field,
  Segmented,
  Toggle
} from '@components/common/page-builder/drawer/index.js';
import { LinkKind, LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

/**
 * Composite editor for a call-to-action: label, URL (via LinkPicker),
 * new-tab toggle, and an optional visual style. Used by every widget that
 * has CTA buttons (split feature, coupon block, bento tiles, brand story,
 * collection spotlight, etc.).
 *
 * The shape stored in widget settings is:
 *
 *   { label, url, kind?, newTab, style? }
 *
 * `kind` is admin-only — the storefront ignores it. Keeping it lets us
 * re-open the picker on the same tab the merchant used last.
 */

export interface CtaValue {
  label: string;
  url: string;
  kind?: LinkKind;
  newTab?: boolean;
  style?: CtaStyle;
}

export type CtaStyle = 'primary' | 'secondary' | 'ghost' | 'link';

const STYLE_OPTIONS: ReadonlyArray<{ value: CtaStyle; label: string }> = [
  { value: 'primary', label: _('Primary') },
  { value: 'secondary', label: _('Outline') },
  { value: 'ghost', label: _('Ghost') },
  { value: 'link', label: _('Link') }
];

export interface CtaFieldProps {
  value: CtaValue;
  onChange: (next: CtaValue) => void;
  /** When false, the visual-style segmented control is hidden. */
  showStyle?: boolean;
  /** Label placeholder, e.g. "Shop now". */
  labelPlaceholder?: string;
}

export function CtaField({
  value,
  onChange,
  showStyle = true,
  labelPlaceholder = 'Shop now'
}: CtaFieldProps) {
  const update = (patch: Partial<CtaValue>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-2.5">
      <Field label={_('Label')}>
        <input
          type="text"
          value={value.label || ''}
          onChange={(e) => update({ label: e.target.value })}
          placeholder={labelPlaceholder}
          className={drawerInputClass}
        />
      </Field>
      <Field label={_('Link')}>
        <LinkPicker
          value={value.url || ''}
          initialKind={value.kind ?? 'custom'}
          onChange={({ url, kind, label }) =>
            update({
              url,
              kind,
              // If the merchant hasn't typed a label yet, seed it with the
              // picked entity's name. Surprisingly often the merchant wants
              // exactly that label anyway.
              label: value.label || label || ''
            })
          }
        />
      </Field>
      <Toggle
        label={_('Open in new tab')}
        description={_('Adds target=_blank rel=noopener noreferrer.')}
        checked={!!value.newTab}
        onChange={(v) => update({ newTab: v })}
      />
      {showStyle && (
        <Field label={_('Style')}>
          <Segmented<CtaStyle>
            value={value.style ?? 'primary'}
            options={STYLE_OPTIONS}
            onChange={(v) => update({ style: v })}
          />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storefront helper — maps the saved `style` value to a shadcn Button
// variant. Centralised so every widget renders CTAs identically.
// ---------------------------------------------------------------------------

export function ctaButtonVariant(style: CtaStyle | undefined) {
  switch (style) {
    case 'secondary':
      return 'outline' as const;
    case 'ghost':
      return 'ghost' as const;
    case 'link':
      return 'link' as const;
    case 'primary':
    default:
      return 'default' as const;
  }
}
