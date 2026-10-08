import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * theme-lab FINDINGS #57 and #58, found by rendering every widget on core with no theme:
 *
 *  - the banner's second button was white on white (the outline variant, `bg-background`,
 *    inheriting the scrim's `text-white`), and
 *  - its heading was near-black on the dark scrim: core's heading rule pins
 *    `color: var(--foreground)`, and the banner heading, unlike the slideshow's, had no
 *    colour class to beat it.
 */
const { AppProvider } = await import('@components/common/context/app.js');
const { default: Banner } = await import('../../Banner.js');

const cta = (label: string, style: string) => ({ label, url: '/', kind: 'custom', newTab: false, style });
const render = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <AppProvider
      value={{ config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<typeof AppProvider>['value']}
    >
      <Banner
        bannerWidget={
          {
            src: '/a.jpg',
            alignment: 'center',
            width: 1200,
            height: 600,
            alt: 'A banner',
            link: null,
            eyebrow: 'NEW',
            heading: 'A headline',
            subText: 'Some copy',
            contentPosition: 'mc',
            overlayTint: 'dark',
            overlayOpacity: 0.5,
            cta: cta('Shop now', 'primary'),
            cta2: cta('Learn more', 'secondary'),
            mobileImage: null,
            mobileImageWidth: null,
            mobileImageHeight: null,
            ...over
          } as unknown as React.ComponentProps<typeof Banner>['bannerWidget']
        }
      />
    </AppProvider>
  );

/** The class tokens of the first element whose class attribute contains `marker`. */
const classesOf = (html: string, marker: string) => {
  const m = new RegExp(`class="([^"]*\\b${marker}\\b[^"]*)"`).exec(html);
  expect(m).not.toBeNull();
  return m![1].split(/\s+/);
};
const ctas = (html: string) =>
  [...html.matchAll(/<a [^>]*class="([^"]*evershop-banner__cta[^"]*)"[^>]*>([^<]*)</g)].map((m) => ({
    label: m[2],
    classes: m[1].split(/\s+/)
  }));

describe('Banner over a dark scrim', () => {
  it('lets the heading take the wrapper colour instead of the global heading rule', () => {
    const heading = classesOf(render(), 'evershop-banner__heading');
    expect(heading).toContain('text-inherit');
  });

  it('renders the second button as clear glass, not white on white', () => {
    const second = ctas(render()).find((c) => c.label === 'Learn more')!;
    expect(second.classes).not.toContain('bg-background');
    expect(second.classes).toContain('bg-transparent');
    expect(second.classes).toContain('text-white');
    expect(second.classes).toContain('border-white/70');
  });

  it('leaves the primary button alone', () => {
    const first = ctas(render()).find((c) => c.label === 'Shop now')!;
    expect(first.classes).toContain('bg-primary');
    expect(first.classes).toContain('text-primary-foreground');
    expect(first.classes).not.toContain('text-white');
  });

  it('does the same for a gradient scrim', () => {
    const second = ctas(render({ overlayTint: 'gradient' })).find((c) => c.label === 'Learn more')!;
    expect(second.classes).toContain('text-white');
    expect(second.classes).not.toContain('bg-background');
  });

  it('turns a link-style button white too: its own colour is dark', () => {
    const second = ctas(render({ cta2: cta('Read more', 'link') })).find((c) => c.label === 'Read more')!;
    expect(second.classes).toContain('text-white');
    expect(second.classes).not.toContain('text-primary');
  });
});

describe('Banner with no scrim, or a light one', () => {
  it.each(['none', 'light'])('keeps the standard buttons on a %s tint', (tint) => {
    const second = ctas(render({ overlayTint: tint })).find((c) => c.label === 'Learn more')!;
    expect(second.classes).toContain('bg-background');
    expect(second.classes).not.toContain('text-white');
    expect(second.classes).not.toContain('bg-transparent');
  });

  it('still lets the heading inherit, which is the foreground colour there', () => {
    const html = render({ overlayTint: 'none' });
    expect(classesOf(html, 'evershop-banner__heading')).toContain('text-inherit');
    expect(classesOf(html, 'evershop-banner__content')).toContain('text-foreground');
  });
});
