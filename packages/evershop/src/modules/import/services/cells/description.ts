/**
 * Description cell → the Editor.js value that the services expect (§ 5.7).
 *
 * A description is stored as rows of columns of blocks. A cell becomes exactly
 * one row with one column; the blocks inside it come from the text.
 */
export interface EditorBlock {
  id: string;
  type: 'paragraph' | 'raw';
  data: { text: string } | { html: string };
}

export interface EditorRow {
  id: string;
  size: 1;
  className: 'md:grid-cols-1';
  columns: [
    {
      id: string;
      size: 1;
      data: { time: number; version: string; blocks: EditorBlock[] };
    }
  ];
}

/** What the converter takes from the outside, so that it stays a pure function. */
export interface DescriptionDeps {
  /** The time to write in the editor value, in milliseconds (`Clock.now()`). */
  now: number;
  /** SHA-256 of a text as 64 hexadecimal digits. */
  sha256Hex: (text: string) => string;
}

/** The Editor.js version written into the value. */
export const EDITOR_VERSION = '2.31.0';

// A cell is HTML when it holds something shaped like a tag.
const HTML = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i;

function looksLikeHtml(text: string): boolean {
  // A tag ends with `>`, so only the text up to the last `>` can hold one. This
  // also keeps a cell of many `<a ` and no `>` from taking time that grows
  // with the square of its length.
  const end = text.lastIndexOf('>');
  return end !== -1 && HTML.test(text.slice(0, end + 1));
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Paragraphs are separated by blank lines; a line break inside one is `<br>`. */
function paragraphsOf(text: string): string[] {
  const paragraphs: string[] = [];
  let lines: string[] = [];
  const flush = () => {
    if (lines.length > 0) {
      paragraphs.push(lines.join('<br>'));
      lines = [];
    }
  };
  for (const line of escapeText(text.replace(/\r\n?/g, '\n')).split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') {
      flush();
    } else {
      lines.push(trimmed);
    }
  }
  flush();
  return paragraphs;
}

/**
 * Converts the text of a description cell (trimmed, not escaped by
 * `prepareText`: `description` is exempt).
 *
 * - HTML becomes one `raw` block as it is; the service sanitizes it. HTML is
 *   not converted to headings or lists.
 * - Plain text is escaped (`&`, `<`, `>`) because the storefront renders the
 *   text of a paragraph as HTML. Blank-line-separated paragraphs become one
 *   block each.
 *
 * The ids come from the text (the first 8 digits of its SHA-256), so the same
 * text gives the same value. A blank text gives `null`: not provided.
 */
export function descriptionToRows(
  text: string,
  deps: DescriptionDeps
): EditorRow[] | null {
  if (text.trim() === '') {
    return null;
  }
  const h = deps.sha256Hex(text).slice(0, 8);
  const blocks: EditorBlock[] = looksLikeHtml(text)
    ? [{ id: `b${h}-0`, type: 'raw', data: { html: text } }]
    : paragraphsOf(text).map((paragraph, index) => ({
        id: `b${h}-${index}`,
        type: 'paragraph',
        data: { text: paragraph }
      }));
  return [
    {
      id: `r${h}`,
      size: 1,
      className: 'md:grid-cols-1',
      columns: [
        {
          id: `c${h}`,
          size: 1,
          data: { time: deps.now, version: EDITOR_VERSION, blocks }
        }
      ]
    }
  ];
}
