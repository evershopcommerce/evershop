/**
 * Minimal inline-markdown renderer for widget body fields. Supports only:
 *
 *   - `**text**`  → <strong>text</strong>
 *   - `_text_`    → <em>text</em>
 *   - newline     → <br />
 *
 * Nothing else. Block-level constructs (headings, lists, blockquotes, code
 * fences) are intentionally absent — widgets that need those use the rich
 * `@components/common/Editor.js` instead. The point of this helper is to
 * keep editorial copy (split feature, brand story, hero copy) lightweight
 * and predictable.
 *
 * Returns a *React* fragment, not raw HTML, so consumers don't need to
 * dangerouslySetInnerHTML. Input is treated as plain text — all HTML in
 * the source string is escaped via React's normal text-node behaviour.
 */
import React from 'react';

type Node = string | React.ReactElement;

const BOLD = /\*\*([^*]+)\*\*/;
const ITALIC = /_([^_]+)_/;

/**
 * Recursively splits a string on the first occurrence of `pattern`,
 * wrapping the matched group in `wrap`. The non-matched halves are then
 * sent back through the next renderer in the chain (italic after bold).
 */
function tokenize(
  input: string,
  pattern: RegExp,
  wrap: (inner: string, key: string) => React.ReactElement,
  next: (s: string, keyPrefix: string) => Node[],
  keyPrefix: string
): Node[] {
  const out: Node[] = [];
  let rest = input;
  let i = 0;
  while (rest.length > 0) {
    const m = rest.match(pattern);
    if (!m || m.index === undefined) {
      out.push(...next(rest, `${keyPrefix}.${i}`));
      break;
    }
    if (m.index > 0) {
      out.push(...next(rest.slice(0, m.index), `${keyPrefix}.${i}t`));
    }
    out.push(wrap(m[1], `${keyPrefix}.${i}w`));
    rest = rest.slice(m.index + m[0].length);
    i += 1;
  }
  return out;
}

function renderItalic(s: string, keyPrefix: string): Node[] {
  return tokenize(
    s,
    ITALIC,
    (inner, k) => <em key={k}>{inner}</em>,
    (text) => [text],
    keyPrefix
  );
}

function renderBold(s: string, keyPrefix: string): Node[] {
  return tokenize(
    s,
    BOLD,
    (inner, k) => <strong key={k}>{renderItalic(inner, `${k}.i`)}</strong>,
    renderItalic,
    keyPrefix
  );
}

/**
 * Render `text` as a React fragment with the supported inline markdown
 * (`**bold**`, `_italic_`, `\n` → `<br/>`).
 */
export function renderInlineMarkdown(text: string | null | undefined): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) nodes.push(<br key={`br.${i}`} />);
    nodes.push(...renderBold(line, `l${i}`));
  });
  return <>{nodes}</>;
}
