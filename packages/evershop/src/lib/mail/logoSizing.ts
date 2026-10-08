/**
 * Fit a logo of known real dimensions into an email display box, preserving
 * aspect ratio and never enlarging beyond the source.
 *
 * We size the logo by a target HEIGHT (with a max width guard) rather than
 * forcing a fixed box, so any logo shape reads well without distortion or
 * letterboxing. The returned width/height are meant to become the `<img>`
 * width/height ATTRIBUTES — the only cap Outlook honors (it ignores CSS
 * `max-width`/`max-height` and would otherwise render the image at its full
 * intrinsic size).
 *
 * `srcW`/`srcH` come from the stored `logoWidth`/`logoHeight` settings, which the
 * admin uploader captures from the image on upload. When they're missing or
 * invalid this returns `null` and the caller falls back to a safe fixed box.
 */
export function fitLogo(
  srcW: number,
  srcH: number,
  maxWidth = 200,
  maxHeight = 44
): { width: number; height: number } | null {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    return null;
  }
  // Scale to fit within maxWidth × maxHeight; the trailing `1` prevents
  // upscaling a small logo (which would only blur it).
  const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale))
  };
}
