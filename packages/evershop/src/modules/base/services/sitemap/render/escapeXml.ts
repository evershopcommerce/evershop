/**
 * Entity-escape a value for inclusion in XML text/attribute content. Ported from the
 * blog RSS feed (`modules/blog/pages/frontStore/blogRss/index.ts`). Google requires that
 * "all tag values must be entity escaped".
 */
export function escapeXml(value: unknown): string {
  return String(value ?? '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}
