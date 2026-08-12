import { Editable } from '@components/common/page-builder/index.js';
import React from 'react';

/**
 * Coupon block — a centred promotional panel with a copy-able code and a
 * CTA. The visual code box + Copy button + Shop CTA pattern consistently
 * outperforms hidden automatic discounts.
 *
 * Expiry handling: when set, an inline script reads the embedded
 * `data-expires` attribute on page load and hides the widget if the time
 * has passed. SSR always renders the block; we don't want to invalidate
 * the SSR cache every time someone's coupon ends. The script handles the
 * real-time suppression for live visitors.
 */

export type CouponBorderStyle = 'solid' | 'dashed' | 'none';

export interface CouponBlockProps {
  couponBlockWidget: {
    eyebrow: string | null;
    heading: string;
    body: string | null;
    code: string;
    ctaLabel: string | null;
    ctaLink: string;
    ctaNewTab: boolean | null;
    expires: string | null;
    borderStyle: CouponBorderStyle | null;
    backgroundColor: string | null;
  };
}

const BORDER_CLASS: Record<CouponBorderStyle, string> = {
  solid: 'border border-foreground/20',
  dashed: 'border border-dashed border-foreground/30',
  none: ''
};

// Self-contained script: reads `data-expires`, hides widget when past.
// Inlined as a string so SSR ships it without hydration boundaries.
const EXPIRY_SCRIPT = `(() => {
  document.querySelectorAll('[data-evershop-coupon-expires]').forEach((el) => {
    const exp = el.getAttribute('data-evershop-coupon-expires');
    if (!exp) return;
    const t = Date.parse(exp);
    if (Number.isFinite(t) && Date.now() >= t) {
      el.setAttribute('hidden', '');
    }
  });
})();`;

// Self-contained script: copy-to-clipboard handler. Falls back to
// selection if clipboard API is unavailable (non-HTTPS or denied).
const COPY_SCRIPT = `(() => {
  document.querySelectorAll('[data-evershop-coupon-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.getAttribute('data-evershop-coupon-copy') || '';
      const label = btn.querySelector('[data-evershop-coupon-copy-label]');
      const original = label ? label.textContent : 'Copy';
      const setLabel = (t) => { if (label) label.textContent = t; };
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(code);
        } else { throw new Error('no clipboard'); }
        setLabel('Copied ✓');
      } catch (_) {
        const box = document.getElementById(btn.getAttribute('data-evershop-coupon-copy-target') || '');
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(box);
          const sel = window.getSelection();
          if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        }
        setLabel('Press ⌘C');
      }
      setTimeout(() => setLabel(original || 'Copy'), 2000);
    });
  });
})();`;

export default function CouponBlock({ couponBlockWidget }: CouponBlockProps) {
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
  } = couponBlockWidget;

  if (!code || !heading) return null;
  const codeUpper = code.toUpperCase();
  const codeBoxId = `coupon-code-${code
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()}`;
  const borderClass = BORDER_CLASS[borderStyle ?? 'dashed'];

  return (
    <>
      <div
        data-evershop-coupon-expires={expires || undefined}
        className={`evershop-coupon-block mx-auto max-w-[640px] rounded-lg px-6 py-8 text-center ${borderClass}`}
        style={{
          backgroundColor: backgroundColor || undefined
        }}
      >
        {eyebrow && (
          <Editable
            as="div"
            fieldPath="settings.eyebrow"
            className="evershop-coupon-block__eyebrow mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/70"
          >
            {eyebrow}
          </Editable>
        )}
        <Editable
          as="h2"
          fieldPath="settings.heading"
          className="evershop-coupon-block__heading text-2xl font-semibold tracking-tight"
        >
          {heading}
        </Editable>
        {body && (
          <Editable
            as="p"
            fieldPath="settings.body"
            multiline
            className="evershop-coupon-block__body mt-2 text-sm text-foreground/70"
          >
            {body}
          </Editable>
        )}
        <div className="evershop-coupon-block__ctas mt-5 flex flex-wrap items-center justify-center gap-2">
          <div
            id={codeBoxId}
            aria-label={`${codeUpper} — click Copy to copy`}
            className="evershop-coupon-block__code-box rounded-md border border-foreground/30 bg-card px-3 py-2 font-mono text-sm font-semibold tracking-wider"
          >
            <span className="evershop-coupon-block__code">{codeUpper}</span>
          </div>
          <button
            type="button"
            data-evershop-coupon-copy={codeUpper}
            data-evershop-coupon-copy-target={codeBoxId}
            aria-live="polite"
            className="evershop-coupon-block__copy-button rounded-md border border-foreground/30 bg-card px-3 py-2 text-sm font-medium hover:bg-muted/30"
          >
            <span data-evershop-coupon-copy-label>Copy</span>
          </button>
          <a
            href={ctaLink}
            target={ctaNewTab ? '_blank' : undefined}
            rel={ctaNewTab ? 'noopener noreferrer' : undefined}
            className="evershop-coupon-block__cta rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {ctaLabel || 'Shop now →'}
          </a>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: COPY_SCRIPT }} />
      {expires && (
        <script dangerouslySetInnerHTML={{ __html: EXPIRY_SCRIPT }} />
      )}
    </>
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
