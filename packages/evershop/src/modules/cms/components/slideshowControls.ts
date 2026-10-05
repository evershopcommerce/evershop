/**
 * Whether a slideshow shows its arrows and dots, and in what style.
 *
 * Each control is stored TWICE: a boolean (`arrows`, `dots`), which is what the widget had
 * first, and a style (`arrowsStyle`: bottom-right | sides | hidden; `dotsStyle`: dots | bars |
 * numbers | hidden), which says where and how. The settings form writes both and keeps them in
 * step, so a widget saved from the page builder never disagrees with itself. A hand-written one
 * can: a `theme.json` that says `arrows: false` beside the `arrowsStyle: 'bottom-right'` that
 * every exported manifest carries. The style used to win silently and the arrows stayed, with
 * nothing to say why (theme-lab FINDINGS #51).
 *
 * Now either field can switch a control off and neither can switch it on over the other's "no":
 * `false` hides, `'hidden'` hides, and the style only chooses WHICH visible style when both are
 * willing. One function, because the rule used to live separately in the resolver, the component
 * and the settings form, which is how it got a trap in the first place.
 */
export type ArrowsStyle = 'bottom-right' | 'sides' | 'hidden';
export type DotsStyle = 'dots' | 'bars' | 'numbers' | 'hidden';

export function resolveArrowsStyle(
  arrows: boolean | null | undefined,
  arrowsStyle: ArrowsStyle | null | undefined
): ArrowsStyle {
  if (arrows === false) {
    return 'hidden';
  }
  return arrowsStyle ?? 'bottom-right';
}

export function resolveDotsStyle(
  dots: boolean | null | undefined,
  dotsStyle: DotsStyle | null | undefined
): DotsStyle {
  if (dots === false) {
    return 'hidden';
  }
  return dotsStyle ?? 'dots';
}
