import xss from 'xss';
import type * as XssModule from 'xss';

// `xss` attaches its helpers (`FilterXSS`, `escapeHtml`, `friendlyAttrValue`,
// `safeAttrValue`) to `module.exports` in a loop, which Node's CommonJS
// export lexer cannot see — so named imports would throw at runtime in the
// SSR bundle. Keep the default import (the whole `module.exports`) and give
// it the module's declared shape for the type-checker.
const lib = xss as unknown as typeof XssModule;

/**
 * Rich-text sanitizer shared by the storefront renderer (`components/common/
 * Editor.tsx`, at render time, on the server and in the browser) and the
 * write path of every rich-text entity (`sanitizeRawHtml` below).
 *
 * Built on `xss` (js-xss): a dependency-light, DOM-free sanitizer that runs
 * identically on both sides, so render-time output never causes a hydration
 * mismatch. It replaced `sanitize-html`, whose parser + PostCSS dependency
 * added ~200 KB (67 KB gzipped) to every storefront page's vendor chunk.
 *
 * The policy is explicit rather than a library default: the same tag and
 * attribute allow-list `sanitize-html` was configured with, plus the same URL
 * scheme rule (`http`, `https`, `ftp`, `mailto`, `tel`, and scheme-less
 * relative / protocol-relative paths). Disallowed tags are stripped but their
 * text is kept, except script/style/textarea/option whose bodies are dropped.
 */

const GLOBAL_ATTRIBUTES = ['class', 'id', 'style'];

const ALLOWED_TAGS = [
  'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'hgroup', 'main', 'nav', 'section', 'blockquote', 'dd', 'div',
  'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'menu', 'ol', 'p', 'pre',
  'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn',
  'em', 'i', 'kbd', 'mark', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp',
  'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
  'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr',
  // EverShop additions (media embeds authored in the admin editor).
  'img', 'figure', 'figcaption', 'video', 'source', 'iframe'
];

const TAG_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'name', 'target'],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading']
};

const ALLOWED_SCHEMES = new Set(['http', 'https', 'ftp', 'mailto', 'tel']);
const URL_ATTRIBUTES = new Set(['href', 'src', 'cite']);

const whiteList: Record<string, string[]> = {};
for (const tag of ALLOWED_TAGS) {
  whiteList[tag] = [...GLOBAL_ATTRIBUTES, ...(TAG_ATTRIBUTES[tag] ?? [])];
}

/**
 * Same rule sanitize-html applies: decode entities, drop control/whitespace
 * characters an attacker can hide a scheme behind (`java\tscript:`), then
 * allow only known schemes or scheme-less (relative, `//`, `#`, `?`) values.
 */
function isSafeUrl(value: string): boolean {
  const cleaned = value.replace(/[\x00-\x20]+/g, '');
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
  return scheme === null || ALLOWED_SCHEMES.has(scheme[1].toLowerCase());
}

function isSafeSrcset(value: string): boolean {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
    .every(isSafeUrl);
}

/**
 * Attribute-value escaping that also neutralises `&`, `<` and `>` (xss only
 * escapes `"`). An `&` that already starts an entity is left alone so that
 * sanitizing twice (write path, then render path) is a no-op.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const VALID_TAG_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

const filter = new lib.FilterXSS({
  whiteList,
  // Disallowed elements: real tags are stripped (their text is kept); a `<`
  // that does not open a tag (`1 < 2`) is escaped so no text is lost.
  onIgnoreTag(tag, html) {
    return VALID_TAG_NAME.test(tag) ? '' : lib.escapeHtml(html);
  },
  stripIgnoreTagBody: ['script', 'style', 'textarea', 'option'],
  allowCommentTag: false,
  css: false,
  // Whitelisted attributes are validated and re-emitted here; returning ''
  // removes the attribute entirely (xss's own path would emit a bare name).
  onTagAttr(tag, name, value, isWhiteAttr) {
    if (!isWhiteAttr) return undefined; // not on the allow-list → dropped
    const decoded = lib.friendlyAttrValue(value);
    if (URL_ATTRIBUTES.has(name)) {
      return isSafeUrl(decoded) ? `${name}="${escapeAttr(decoded)}"` : '';
    }
    if (name === 'srcset') {
      return isSafeSrcset(decoded) ? `${name}="${escapeAttr(decoded)}"` : '';
    }
    if (name === 'style') {
      // xss's guard: drops `expression()` and `url(javascript:…)` styles.
      const safe = lib.safeAttrValue(tag, name, value, false as any);
      return safe ? `${name}="${escapeAttr(lib.friendlyAttrValue(safe))}"` : '';
    }
    return `${name}="${escapeAttr(decoded)}"`;
  }
});

/**
 * Reduce untrusted input to plain text: every tag is removed (script/style
 * bodies included) and entities are decoded, so the result is safe for a
 * text sink (React text, a DB column rendered as text) and never
 * double-escaped there. Whitespace and length are the caller's business.
 */
const stripFilter = new lib.FilterXSS({
  whiteList: {},
  // Real tags go (their text stays); a `<` that does not open a tag is text.
  onIgnoreTag(tag, html) {
    return VALID_TAG_NAME.test(tag) ? '' : html;
  },
  stripIgnoreTagBody: ['script', 'style', 'textarea', 'option'],
  allowCommentTag: false,
  css: false,
  escapeHtml: (text: string) => text
});

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0'
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named ?? match;
  });
}

export function stripTags(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.length === 0) return '';
  return decodeEntities(stripFilter.process(text));
}

/**
 * Sanitize a single HTML string with the allow-list used for stored
 * rich-text. Deterministic and isomorphic, so it can run at render time
 * without a hydration mismatch.
 *
 * Use this at any `dangerouslySetInnerHTML` sink that renders
 * user/admin-authored HTML — it strips `<script>`, event-handler attributes
 * (`onerror`, …), and `javascript:`/`data:` URLs while keeping formatting.
 */
export function sanitize(html: unknown): string {
  if (typeof html !== 'string' || html.length === 0) {
    return '';
  }
  return filter.process(html);
}

export interface Row {
  id: string;
  size: number;
  columns: {
    id: string;
    size: number;
    data: any;
  }[];
}

/**
 * Sanitizes the HTML content in all EditorJS raw HTML blocks within the page content.
 * Each column's `data` is an EditorJS block: { type, data: { ... } }.
 * For "raw" type blocks, `data.html` is sanitized in place.
 */
function sanitizeRawHtml(editorJSData: Row[]) {
  if (!Array.isArray(editorJSData)) {
    return;
  }
  editorJSData.forEach((row) => {
    if (!Array.isArray(row.columns)) {
      return;
    }
    row.columns.forEach((column) => {
      if (!column.data || !Array.isArray(column.data.blocks)) {
        return;
      }
      column.data.blocks.forEach((block) => {
        if (
          block.type === 'raw' &&
          block.data &&
          typeof block.data.html === 'string'
        ) {
          block.data.html = sanitize(block.data.html);
        }
      });
    });
  });
}

export { sanitizeRawHtml };
