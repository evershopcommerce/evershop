import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Filled buttons were different heights in different widgets (theme-lab FINDINGS #60, measured on
 * core with no theme): the call-to-action buttons are 40px (`size: lg`), the contact form's submit was
 * the shared Button's default (36px), and the coupon block's three controls were hand-rolled at 38px.
 * They are one scale now.
 */
const { AppProvider } = await import('@components/common/context/app.js');
const { Form } = await import('@components/common/form/Form.js');
const { default: CouponBlock } = await import('../../CouponBlock.js');
const { default: ContactForm } = await import('../../ContactForm.js');

const state = { config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<
  typeof AppProvider
>['value'];
const inApp = (el: React.ReactElement) => renderToStaticMarkup(<AppProvider value={state}>{el}</AppProvider>);
const classesOf = (html: string, tag: string, marker: string) => {
  const m = new RegExp(`<${tag} [^>]*class="([^"]*\\b${marker}\\b[^"]*)"`).exec(html);
  return m ? m[1].split(/\s+/) : null;
};

describe('coupon block', () => {
  const html = inApp(
    <CouponBlock
      couponBlockWidget={{ eyebrow: 'LIMITED', heading: 'Take 20% off', body: 'At checkout', code: 'save20', ctaLabel: 'Shop now', ctaLink: '/', ctaNewTab: false, expires: null, borderStyle: 'dashed', backgroundColor: null }}
    />
  );

  it('draws the code box, the copy button and the call to action at one height', () => {
    for (const marker of ['evershop-coupon-block__code-box', 'evershop-coupon-block__copy-button', 'evershop-coupon-block__cta']) {
      const classes = classesOf(html, '(?:div|button|a)', marker);
      expect(classes).not.toBeNull();
      expect(classes).toContain('h-10');
    }
  });

  it('uses the shared button classes, so a change to the scale reaches them', () => {
    expect(classesOf(html, 'a', 'evershop-coupon-block__cta')).toContain('bg-primary');
    expect(classesOf(html, 'button', 'evershop-coupon-block__copy-button')).toContain('bg-background');
  });

  it('keeps what the copy script and a theme hook onto', () => {
    expect(html).toContain('data-evershop-coupon-copy="SAVE20"');
    expect(html).toContain('data-evershop-coupon-copy-label');
    expect(html).toContain('evershop-coupon-block__code');
  });
});

describe('Form submit size', () => {
  const form = (props: Record<string, unknown> = {}) => inApp(<Form {...props}><input name="a" /></Form>);
  const submit = (html: string) => classesOf(html, 'button', 'inline-flex');

  it('is the shared default (36px) unless a form asks for more', () => {
    expect(submit(form())).toContain('h-9');
  });

  it('can be raised to the call-to-action size', () => {
    const classes = submit(form({ submitBtnSize: 'lg' }));
    expect(classes).toContain('h-10');
    expect(classes).not.toContain('h-9');
  });
});

describe('contact form', () => {
  it('submits with a call-to-action sized button, like the widgets around it', () => {
    const html = inApp(
      <ContactForm
        contactFormWidget={{ title: 'Get in touch', subtitle: null, submitLabel: null, successMessage: null, showPhone: false, showSubject: true, consentEnabled: false, consentText: null }}
      />
    );
    const classes = classesOf(html, 'button', 'inline-flex');
    expect(classes).toContain('h-10');
    expect(html).toContain('Send message');
  });
});
