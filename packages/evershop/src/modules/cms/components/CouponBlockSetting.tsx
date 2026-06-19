import {
  ColorSwatchField,
  drawerInputClass,
  drawerTextareaClass,
  Field,
  Section,
  Segmented,
  Toggle,
  useScopedFormContext
} from '@components/common/page-builder/index.js';
import { LinkPicker } from '@components/common/page-builder/pickers/LinkPicker.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type { CouponBorderStyle } from './CouponBlock.js';

interface CouponBlockSettingProps {
  couponBlockWidget?: {
    eyebrow?: string | null;
    heading?: string;
    body?: string | null;
    code?: string;
    ctaLabel?: string | null;
    ctaLink?: string;
    ctaNewTab?: boolean | null;
    expires?: string | null;
    borderStyle?: CouponBorderStyle | null;
    backgroundColor?: string | null;
  };
}

const BORDER_OPTIONS: ReadonlyArray<{
  value: CouponBorderStyle;
  label: string;
}> = [
  { value: 'solid', label: _('Solid') },
  { value: 'dashed', label: _('Dashed') },
  { value: 'none', label: _('None') }
];

function formatCountdown(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = t - Date.now();
  if (diff <= 0) return _('Already expired');
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days >= 1)
    return _('Expires in ${days}d ${hours}h', {
      days: String(days),
      hours: String(hours)
    });
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return _('Expires in ${hours}h ${minutes}m', {
    hours: String(hours),
    minutes: String(minutes)
  });
}

export default function CouponBlockSetting({
  couponBlockWidget
}: CouponBlockSettingProps) {
  const {
    eyebrow,
    heading,
    body,
    code,
    ctaLabel,
    ctaLink,
    ctaNewTab,
    expires,
    borderStyle,
    backgroundColor
  } = couponBlockWidget ?? {};

  const { register, setValue, watch } = useScopedFormContext();

  const eyebrowV = (watch('settings.eyebrow') as string) ?? eyebrow ?? '';
  const headingV = (watch('settings.heading') as string) ?? heading ?? '';
  const bodyV = (watch('settings.body') as string) ?? body ?? '';
  const codeV = (watch('settings.code') as string) ?? code ?? '';
  const ctaLabelV = (watch('settings.ctaLabel') as string) ?? ctaLabel ?? '';
  const ctaLinkV = (watch('settings.ctaLink') as string) ?? ctaLink ?? '';
  const ctaNewTabV =
    (watch('settings.ctaNewTab') as boolean | null) ?? ctaNewTab ?? false;
  const expiresV = (watch('settings.expires') as string) ?? expires ?? '';
  const borderStyleV =
    ((watch('settings.borderStyle') as string) ??
      borderStyle ??
      'dashed') as CouponBorderStyle;
  const backgroundColorV =
    (watch('settings.backgroundColor') as string) ?? backgroundColor ?? '';

  // datetime-local accepts `YYYY-MM-DDTHH:MM`; storage is ISO. Convert both
  // ways so the input mirrors what's saved.
  const localExpiresInput = expiresV
    ? (() => {
        const d = new Date(expiresV);
        if (Number.isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : '';

  return (
    <div className="space-y-3">
      <Section title={_('Offer')}>
        <Field label={_('Eyebrow')} hint={_('Urgency line. Optional. E.g. "Limited · Ends Sunday".')}>
          <input
            type="text"
            value={eyebrowV}
            onChange={(e) =>
              setValue('settings.eyebrow', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Limited · Ends Sunday')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Headline')}>
          <input
            type="text"
            value={headingV}
            onChange={(e) =>
              setValue('settings.heading', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Take 20% off your order')}
            className={drawerInputClass}
          />
        </Field>
        <Field
          label={_('Body')}
          hint={_('Optional. One short instructional line.')}
        >
          <input
            type="text"
            value={bodyV}
            onChange={(e) =>
              setValue('settings.body', e.target.value, { shouldDirty: true })
            }
            placeholder={_('Use code at checkout')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Promo code')} hint={_('Displayed in uppercase to shoppers.')}>
          <input
            type="text"
            value={codeV}
            onChange={(e) =>
              setValue('settings.code', e.target.value, { shouldDirty: true })
            }
            placeholder="SUMMER20"
            className={`${drawerInputClass} uppercase font-mono`}
          />
        </Field>
        <Field
          label={_('Expires')}
          hint={
            expiresV
              ? formatCountdown(expiresV)
              : _('Optional. The block auto-hides after this time for live visitors.')
          }
        >
          <input
            type="datetime-local"
            value={localExpiresInput}
            onChange={(e) => {
              const v = e.target.value;
              const iso = v ? new Date(v).toISOString() : '';
              setValue('settings.expires', iso || null, { shouldDirty: true });
            }}
            className={drawerInputClass}
          />
        </Field>
      </Section>

      <Section title={_('Call to action')}>
        <Field label={_('Button label')}>
          <input
            type="text"
            value={ctaLabelV}
            onChange={(e) =>
              setValue('settings.ctaLabel', e.target.value, {
                shouldDirty: true
              })
            }
            placeholder={_('Shop now →')}
            className={drawerInputClass}
          />
        </Field>
        <Field label={_('Button link')}>
          <LinkPicker
            value={ctaLinkV}
            onChange={({ url }) =>
              setValue('settings.ctaLink', url, { shouldDirty: true })
            }
          />
        </Field>
        <Toggle
          label={_('Open in new tab')}
          checked={ctaNewTabV}
          onChange={(v) =>
            setValue('settings.ctaNewTab', v, { shouldDirty: true })
          }
        />
      </Section>

      <Section title={_('Appearance')}>
        <Field label={_('Border')}>
          <Segmented<CouponBorderStyle>
            value={borderStyleV}
            options={BORDER_OPTIONS}
            onChange={(v) =>
              setValue('settings.borderStyle', v, { shouldDirty: true })
            }
          />
        </Field>
        <Field label={_('Background')}>
          <ColorSwatchField
            value={backgroundColorV}
            onChange={(v) =>
              setValue('settings.backgroundColor', v || null, {
                shouldDirty: true
              })
            }
          />
        </Field>
      </Section>

      {/* Hidden mirrors for legacy widgetEdit form submission. */}
      <input
        type="hidden"
        {...register('settings.eyebrow')}
        defaultValue={eyebrow ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.heading')}
        defaultValue={heading ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.body')}
        defaultValue={body ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.code')}
        defaultValue={code ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.ctaLabel')}
        defaultValue={ctaLabel ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.ctaLink')}
        defaultValue={ctaLink ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.expires')}
        defaultValue={expires ?? ''}
      />
      <input
        type="hidden"
        {...register('settings.borderStyle')}
        defaultValue={borderStyle ?? 'dashed'}
      />
      <input
        type="hidden"
        {...register('settings.backgroundColor')}
        defaultValue={backgroundColor ?? ''}
      />
    </div>
  );
}

export const query = `
  query Query(
    $eyebrow: String
    $heading: String
    $body: String
    $code: String
    $ctaLabel: String
    $ctaLink: String
    $ctaNewTab: Boolean
    $expires: String
    $borderStyle: String
    $backgroundColor: String
  ) {
    couponBlockWidget(
      eyebrow: $eyebrow
      heading: $heading
      body: $body
      code: $code
      ctaLabel: $ctaLabel
      ctaLink: $ctaLink
      ctaNewTab: $ctaNewTab
      expires: $expires
      borderStyle: $borderStyle
      backgroundColor: $backgroundColor
    ) {
      eyebrow
      heading
      body
      code
      ctaLabel
      ctaLink
      ctaNewTab
      expires
      borderStyle
      backgroundColor
    }
  }
`;

export const variables = `{
  eyebrow: getWidgetSetting("eyebrow"),
  heading: getWidgetSetting("heading"),
  body: getWidgetSetting("body"),
  code: getWidgetSetting("code"),
  ctaLabel: getWidgetSetting("ctaLabel"),
  ctaLink: getWidgetSetting("ctaLink"),
  ctaNewTab: getWidgetSetting("ctaNewTab", false),
  expires: getWidgetSetting("expires"),
  borderStyle: getWidgetSetting("borderStyle", "dashed"),
  backgroundColor: getWidgetSetting("backgroundColor")
}`;
