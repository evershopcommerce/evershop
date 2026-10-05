import { describe, expect, it } from '@jest/globals';
import { buttonVariants } from '../../Button.js';
import { scrimButtonClassName } from '../../scrimButton.js';

/**
 * Over a dark scrim a banner or a slide puts `text-white` on its wrapper, and a
 * button variant with no colour of its own inherits it. `outline` is `bg-background`
 * (white), so its label was white on white: an empty rectangle on core with no
 * theme (theme-lab FINDINGS #57). These pin what a button on a scrim becomes.
 */
const tokens = (classes: string) => classes.split(/\s+/);
const lg = (variant: Parameters<typeof buttonVariants>[0] extends infer P ? (P extends { variant?: infer V } ? V : never) : never) =>
  buttonVariants({ variant, size: 'lg' });

describe('scrimButtonClassName', () => {
  describe('outline', () => {
    const base = lg('outline');
    const onScrim = tokens(scrimButtonClassName('outline', base));

    it('starts from a white fill and no text colour: the bug', () => {
      expect(tokens(base)).toContain('bg-background');
      expect(tokens(base).some((t) => /^text-(white|foreground|primary)/.test(t))).toBe(false);
    });

    it('loses the white fill, the default edge and the pale hover', () => {
      expect(onScrim).not.toContain('bg-background');
      expect(onScrim).not.toContain('border-border');
      expect(onScrim).not.toContain('hover:bg-muted');
      expect(onScrim).not.toContain('hover:text-foreground');
      expect(onScrim).not.toContain('shadow-xs');
    });

    it('becomes clear glass with a white edge and a white label', () => {
      expect(onScrim).toContain('bg-transparent');
      expect(onScrim).toContain('text-white');
      expect(onScrim).toContain('border-white/70');
      expect(onScrim).toContain('hover:bg-white/15');
      expect(onScrim).toContain('hover:text-white');
    });

    it('keeps the size and the shape: only colour changes', () => {
      for (const kept of ['h-10', 'rounded-md', 'inline-flex', 'items-center']) {
        expect(onScrim).toContain(kept);
      }
    });
  });

  it('turns a link white: its own colour is dark on a dark scrim', () => {
    const base = lg('link');
    expect(tokens(base)).toContain('text-primary');
    const onScrim = tokens(scrimButtonClassName('link', base));
    expect(onScrim).not.toContain('text-primary');
    expect(onScrim).toContain('text-white');
  });

  it('keeps a ghost button glass on hover instead of flipping to a pale fill', () => {
    const onScrim = tokens(scrimButtonClassName('ghost', lg('ghost')));
    expect(onScrim).not.toContain('hover:bg-muted');
    expect(onScrim).not.toContain('hover:text-foreground');
    expect(onScrim).toContain('hover:bg-white/15');
    expect(onScrim).toContain('text-white');
  });

  it.each(['default', 'secondary', 'destructive'] as const)(
    'leaves %s alone: it brings its own colour pair',
    (variant) => {
      const base = lg(variant);
      expect(scrimButtonClassName(variant, base)).toBe(base);
    }
  );

  it('leaves a button with no variant alone', () => {
    const base = buttonVariants({ size: 'lg' });
    expect(scrimButtonClassName(undefined, base)).toBe(base);
    expect(scrimButtonClassName(null, base)).toBe(base);
  });
});
