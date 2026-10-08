import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * A slide's text is always white and always over its photograph, so a slide button of
 * the outline style was white on white, like the banner's (theme-lab FINDINGS #57).
 */
// react-slick is CommonJS: under Jest's ESM interop the default import is the module object, not the component.
// Only the slides' buttons matter here, so the carousel is a plain container.
jest.unstable_mockModule('react-slick', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div className="slick-test">{children}</div>
}));

const { AppProvider } = await import('@components/common/context/app.js');
const { default: Slideshow } = await import('../../Slideshow.js');

const slide = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  image: '/a.jpg',
  width: 1200,
  height: 600,
  headline: 'A headline',
  subText: 'Some copy',
  buttonText: 'Shop now',
  buttonLink: '/',
  buttonStyle: 'default',
  button2Text: 'Learn more',
  button2Link: '/',
  button2Style: 'outline',
  contentPosition: 'ml',
  overlayTint: 'dark',
  overlayOpacity: 0.5,
  hidden: false,
  ...over
});
const render = (slides: unknown[]) =>
  renderToStaticMarkup(
    <AppProvider
      value={{ config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<typeof AppProvider>['value']}
    >
      <Slideshow
        slideshowWidget={
          { slides, autoplay: false, arrowsStyle: 'hidden', dotsStyle: 'hidden', aspectRatio: 'auto' } as unknown as React.ComponentProps<typeof Slideshow>['slideshowWidget']
        }
      />
    </AppProvider>
  );
const buttons = (html: string) =>
  [...html.matchAll(/<a [^>]*class="([^"]*evershop-slideshow__cta[^"]*)"[^>]*>/g)].map((m) => m[1].split(/\s+/));

describe('Slideshow buttons', () => {
  it('renders an outline button as clear glass with a white label', () => {
    const [, second] = buttons(render([slide()]));
    expect(second).toBeDefined();
    expect(second).not.toContain('bg-background');
    expect(second).toContain('bg-transparent');
    expect(second).toContain('text-white');
  });

  it('leaves the primary button alone', () => {
    const [first] = buttons(render([slide()]));
    expect(first).toContain('bg-primary');
    expect(first).not.toContain('bg-transparent');
  });

  it('turns a link-style button white', () => {
    const [first] = buttons(render([slide({ buttonStyle: 'link', button2Text: '' })]));
    expect(first).toContain('text-white');
    expect(first).not.toContain('text-primary');
  });

  it('keeps the legacy "filled" value working as the primary button', () => {
    const [first] = buttons(render([slide({ buttonStyle: 'filled', button2Text: '' })]));
    expect(first).toContain('bg-primary');
  });
});
