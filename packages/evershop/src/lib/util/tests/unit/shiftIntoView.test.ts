import { describe, expect, it } from '@jest/globals';
import { shiftIntoView } from '../../shiftIntoView.js';

/**
 * The mobile menu panel hangs from its toggle's left edge. With a centred toggle on a 390px phone
 * that is x=175, so a 256px panel ends at 431: 41px off the screen (theme-lab FINDINGS #53).
 */
describe('shiftIntoView', () => {
  const VIEWPORT = 390;

  it('leaves a box that fits exactly where it is', () => {
    expect(shiftIntoView(16, 272, VIEWPORT)).toBe(0);
  });

  it('leaves a box that sits exactly on the gutters', () => {
    expect(shiftIntoView(8, 382, VIEWPORT)).toBe(0);
  });

  it('pulls a box that runs off the right back inside, keeping a gutter', () => {
    // The real case: toggle centred at 175, panel 256 wide.
    const dx = shiftIntoView(175, 431, VIEWPORT);
    expect(dx).toBe(-49);
    expect(175 + dx).toBe(126);
    expect(431 + dx).toBe(VIEWPORT - 8);
  });

  it('pushes a box that runs off the left back inside', () => {
    expect(shiftIntoView(-30, 226, VIEWPORT)).toBe(38);
  });

  it('lines a box wider than the room up with the left gutter, so its start is reachable', () => {
    expect(shiftIntoView(100, 480, 300)).toBe(8 - 100);
    expect(shiftIntoView(-20, 400, 300)).toBe(28);
  });

  it('honours a different gutter', () => {
    expect(shiftIntoView(175, 431, VIEWPORT, 0)).toBe(-41);
    expect(shiftIntoView(2, 100, VIEWPORT, 16)).toBe(14);
  });

  it('never moves a box that already fits, whatever the viewport', () => {
    for (const width of [320, 390, 768, 1440]) {
      expect(shiftIntoView(20, 120, width)).toBe(0);
    }
  });

  it('always lands the result inside the gutters when the box fits the room', () => {
    for (let left = -300; left <= 500; left += 17) {
      const right = left + 256;
      const dx = shiftIntoView(left, right, VIEWPORT);
      expect(left + dx).toBeGreaterThanOrEqual(8);
      expect(right + dx).toBeLessThanOrEqual(VIEWPORT - 8);
    }
  });
});
