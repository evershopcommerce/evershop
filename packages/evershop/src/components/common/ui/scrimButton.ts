import { cn } from '@evershop/evershop/lib/util/cn';

/**
 * Classes for a button that sits on a photograph or a dark scrim.
 *
 * The shared button variants assume a light surface. Over a dark scrim the
 * wrapper sets `text-white`, and a variant that brings no colour of its own
 * inherits it:
 *
 *  - `outline` is `bg-background` (white) with no text colour, so its label is
 *    white on white: an empty rectangle.
 *  - `link` carries `text-primary`, which is dark on a dark scrim.
 *  - `ghost` survives (transparent, inherited white) but flips to a pale `muted`
 *    fill with dark text on hover, which breaks the look.
 *
 * `default` and `secondary` bring their own colour pair and need nothing.
 *
 * The three that need it become clear glass with an edge and a label in the
 * scrim's text colour. `cn` merges (tailwind-merge), so the new colour replaces
 * the variant's, instead of both being emitted and the stylesheet's order picking
 * one.
 *
 * Takes the variant's own classes as an argument instead of importing the
 * Button: widgets import `buttonVariants` through the `@components` alias, so a
 * theme that overrides Button.tsx stays consistent, and this file must not
 * reach past that override.
 */
type Variant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'link'
  | null
  | undefined;

const ON_SCRIM: Partial<Record<NonNullable<Variant>, string>> = {
  outline:
    'border-white/70 bg-transparent text-white shadow-none hover:bg-white/15 hover:text-white',
  ghost: 'text-white hover:bg-white/15 hover:text-white',
  link: 'text-white'
};

export function scrimButtonClassName(variant: Variant, base: string): string {
  const extra = variant ? ON_SCRIM[variant] : undefined;
  return extra ? cn(base, extra) : base;
}
