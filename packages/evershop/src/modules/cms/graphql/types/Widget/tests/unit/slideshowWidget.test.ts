import { describe, expect, it } from '@jest/globals';
import resolvers from '../../Widget.resolvers.js';

/**
 * The storefront reads the slideshow's controls from this resolver, which always hands the
 * component a style. The legacy booleans it returns must agree with that style, or the same
 * answer carries two meanings (theme-lab FINDINGS #51).
 */
const slideshowWidget = (resolvers as any).Query.slideshowWidget as (
  parent: unknown,
  args: Record<string, unknown>,
  context: { linkLoaders: Record<string, unknown> }
) => Promise<{ arrows: boolean; dots: boolean; arrowsStyle: string; dotsStyle: string }>;

const run = (args: Record<string, unknown>) => slideshowWidget(null, { slides: [], ...args }, { linkLoaders: {} });

describe('slideshowWidget controls', () => {
  it('shows both controls in the usual style when nothing is set', async () => {
    expect(await run({})).toMatchObject({ arrows: true, dots: true, arrowsStyle: 'bottom-right', dotsStyle: 'dots' });
  });

  it('honours the legacy booleans when no style is given', async () => {
    expect(await run({ arrows: false, dots: false })).toMatchObject({
      arrows: false,
      dots: false,
      arrowsStyle: 'hidden',
      dotsStyle: 'hidden'
    });
  });

  it('keeps the arrows hidden when a hand-written manifest says arrows:false beside a visible style', async () => {
    const out = await run({ arrows: false, arrowsStyle: 'bottom-right', dots: false, dotsStyle: 'dots' });
    expect(out).toMatchObject({ arrows: false, arrowsStyle: 'hidden', dots: false, dotsStyle: 'hidden' });
  });

  it('lets the style hide a control by itself, and says so in the boolean too', async () => {
    const out = await run({ arrows: true, arrowsStyle: 'hidden', dotsStyle: 'hidden' });
    expect(out).toMatchObject({ arrows: false, arrowsStyle: 'hidden', dots: false, dotsStyle: 'hidden' });
  });

  it('picks the style when both agree the control is on', async () => {
    expect(await run({ arrows: true, arrowsStyle: 'sides', dots: true, dotsStyle: 'numbers' })).toMatchObject({
      arrows: true,
      arrowsStyle: 'sides',
      dots: true,
      dotsStyle: 'numbers'
    });
  });

  it('never returns a boolean that contradicts its own style', async () => {
    for (const arrows of [undefined, true, false]) {
      for (const arrowsStyle of [undefined, 'bottom-right', 'sides', 'hidden']) {
        const out = await run({ arrows, arrowsStyle });
        expect(out.arrows).toBe(out.arrowsStyle !== 'hidden');
      }
    }
  });
});
