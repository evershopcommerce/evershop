import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The component, given the contradictory settings a hand-written manifest can carry, as the
 * resolver would hand them (or raw, as the page builder's preview does).
 */
// react-slick is CommonJS: under Jest's ESM interop the default import is the module object. The carousel
// is a container that exposes the `arrows` and `dots` it was asked for.
jest.unstable_mockModule('react-slick', () => ({
  default: ({ children, arrows, dots }: { children: React.ReactNode; arrows?: boolean; dots?: boolean }) => (
    <div className="slick-test" data-arrows={String(arrows)} data-dots={String(dots)}>
      {children}
    </div>
  )
}));
const { AppProvider } = await import('@components/common/context/app.js');
const { default: Slideshow } = await import('../../Slideshow.js');

const slide = { id: 's1', image: '/a.jpg', width: 1200, height: 600, headline: 'H', hidden: false };
const render = (widget: Record<string, unknown>) =>
  renderToStaticMarkup(
    <AppProvider
      value={{ config: { pageMeta: { route: { id: 'homepage' } } }, widgets: [], propsMap: {} } as unknown as React.ComponentProps<typeof AppProvider>['value']}
    >
      <Slideshow slideshowWidget={{ slides: [slide], autoplay: false, ...widget } as unknown as React.ComponentProps<typeof Slideshow>['slideshowWidget']} />
    </AppProvider>
  );
const asked = (html: string) => ({
  arrows: /data-arrows="(\w+)"/.exec(html)?.[1],
  dots: /data-dots="(\w+)"/.exec(html)?.[1]
});

describe('Slideshow controls', () => {
  it('hides the arrows and the dots when the booleans say so, whatever the styles say', () => {
    expect(asked(render({ arrows: false, arrowsStyle: 'bottom-right', dots: false, dotsStyle: 'dots' }))).toEqual({ arrows: 'false', dots: 'false' });
  });

  it('shows them when both fields are willing', () => {
    expect(asked(render({ arrows: true, arrowsStyle: 'sides', dots: true, dotsStyle: 'bars' }))).toEqual({ arrows: 'true', dots: 'true' });
  });

  it('hides a control the style hides, even if the boolean says yes', () => {
    expect(asked(render({ arrows: true, arrowsStyle: 'hidden', dots: true, dotsStyle: 'hidden' }))).toEqual({ arrows: 'false', dots: 'false' });
  });

  it('shows both by default, as a slideshow created before these fields did', () => {
    expect(asked(render({}))).toEqual({ arrows: 'true', dots: 'true' });
  });
});
