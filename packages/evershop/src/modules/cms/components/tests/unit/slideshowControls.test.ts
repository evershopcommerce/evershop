import { describe, expect, it } from '@jest/globals';
import { resolveArrowsStyle, resolveDotsStyle, type ArrowsStyle, type DotsStyle } from '../../slideshowControls.js';

/**
 * A slideshow stores each control twice, a boolean and a style, and a hand-written theme.json can
 * make them disagree. `arrows: false` beside `arrowsStyle: 'bottom-right'` used to keep the arrows,
 * silently (theme-lab FINDINGS #51). Either field can now switch a control off; neither can switch
 * it on over the other's "no".
 */
type ArrowsCase = [boolean | null | undefined, ArrowsStyle | null | undefined, ArrowsStyle];
type DotsCase = [boolean | null | undefined, DotsStyle | null | undefined, DotsStyle];

describe('resolveArrowsStyle', () => {
  it.each<ArrowsCase>([
    // [arrows, arrowsStyle, result]
    [undefined, undefined, 'bottom-right'],
    [true, undefined, 'bottom-right'],
    [null, null, 'bottom-right'],
    [true, 'bottom-right', 'bottom-right'],
    [true, 'sides', 'sides'],
    [undefined, 'sides', 'sides'],
    // the old way to say "none", still honoured
    [false, undefined, 'hidden'],
    [false, null, 'hidden'],
    // the style can say "none" by itself
    [true, 'hidden', 'hidden'],
    [undefined, 'hidden', 'hidden'],
    // the trap: the boolean says no, the style says yes. The no wins.
    [false, 'bottom-right', 'hidden'],
    [false, 'sides', 'hidden']
  ])('arrows=%s arrowsStyle=%s -> %s', (arrows, style, expected) => {
    expect(resolveArrowsStyle(arrows, style)).toBe(expected);
  });
});

describe('resolveDotsStyle', () => {
  it.each<DotsCase>([
    [undefined, undefined, 'dots'],
    [true, undefined, 'dots'],
    [true, 'bars', 'bars'],
    [undefined, 'numbers', 'numbers'],
    [false, undefined, 'hidden'],
    [true, 'hidden', 'hidden'],
    [false, 'dots', 'hidden'],
    [false, 'numbers', 'hidden']
  ])('dots=%s dotsStyle=%s -> %s', (dots, style, expected) => {
    expect(resolveDotsStyle(dots, style)).toBe(expected);
  });
});

describe('a widget saved from the settings form', () => {
  // The form writes the boolean as `style !== 'hidden'`, so the two always agree and the
  // resolution changes nothing for them.
  it.each(['bottom-right', 'sides', 'hidden'] as const)('is unchanged for arrowsStyle=%s', (style) => {
    expect(resolveArrowsStyle(style !== 'hidden', style)).toBe(style);
  });
  it.each(['dots', 'bars', 'numbers', 'hidden'] as const)('is unchanged for dotsStyle=%s', (style) => {
    expect(resolveDotsStyle(style !== 'hidden', style)).toBe(style);
  });
});
