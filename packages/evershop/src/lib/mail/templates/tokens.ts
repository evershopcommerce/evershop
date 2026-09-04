/**
 * Design tokens for the transactional email layout. Email needs literal inline
 * styles, so these are interpolated into the template strings at module load —
 * one place to change the look for all five emails. The default is a restrained
 * black-and-white treatment; `brand.accentColor` (from settings) overrides the
 * button/link color per store without touching the layout.
 */
export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const INK = '#111114';
export const MUTED = '#6b7280';
export const FAINT = '#9aa0a8';
export const LINE = '#e7e8ea';
export const GROUND = '#f4f4f5';
export const PANEL = '#ffffff';
export const SOFT = '#f6f6f7';
/** Fallback accent when no `emailAccentColor` setting is configured. */
export const DEFAULT_ACCENT = '#111114';
