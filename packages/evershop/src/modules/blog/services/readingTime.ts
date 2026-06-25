/**
 * Estimated reading time (minutes) for a post's Editor.js `description`
 * (spec §8). Walks the rows → columns → blocks shape that
 * `components/common/Editor.tsx` renders, counting words and images.
 *
 * Pure + side-effect free so it can run in the create/update transaction and
 * be unit-tested against fixture documents.
 */

const DEFAULT_WPM = 200;
const DEFAULT_SECONDS_PER_IMAGE = 10;

interface EditorBlock {
  type?: string;
  data?: {
    text?: string;
    caption?: string;
    html?: string;
    items?: Array<string | { content?: string }>;
    products?: unknown[];
    [key: string]: unknown;
  };
}

interface EditorColumn {
  data?: { blocks?: EditorBlock[] };
}

interface EditorRow {
  columns?: EditorColumn[];
}

export interface ReadingTimeOptions {
  /** Words per minute (default 200). */
  wpm?: number;
  /** Seconds attributed to the first image; subsequent images decay (default 10). */
  secondsPerImage?: number;
}

function stripHtml(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
}

function countWords(value: unknown): number {
  const text = stripHtml(value).trim();
  return text ? text.split(/\s+/).length : 0;
}

function listItemsToText(items: Array<string | { content?: string }>): string {
  return items
    .map((item) => (typeof item === 'string' ? item : item?.content ?? ''))
    .join(' ');
}

/**
 * @param content - Editor.js rows (array) or the stored JSON string.
 * @param options - WPM + per-image seconds (from blog settings).
 * @returns whole minutes, minimum 1.
 */
export function readingTime(
  content: EditorRow[] | string | null | undefined,
  options: ReadingTimeOptions = {}
): number {
  const wpm = options.wpm && options.wpm > 0 ? options.wpm : DEFAULT_WPM;
  const secondsPerImage =
    typeof options.secondsPerImage === 'number'
      ? options.secondsPerImage
      : DEFAULT_SECONDS_PER_IMAGE;

  let rows: unknown = content;
  if (typeof content === 'string') {
    try {
      rows = JSON.parse(content);
    } catch {
      return 1;
    }
  }
  if (!Array.isArray(rows)) {
    return 1;
  }

  let words = 0;
  let images = 0;

  for (const row of rows as EditorRow[]) {
    for (const column of row?.columns ?? []) {
      for (const block of column?.data?.blocks ?? []) {
        switch (block?.type) {
          case 'paragraph':
          case 'header':
          case 'quote':
            words += countWords(block.data?.text) + countWords(block.data?.caption);
            break;
          case 'list':
            if (Array.isArray(block.data?.items)) {
              words += countWords(listItemsToText(block.data.items));
            }
            break;
          case 'raw':
            words += countWords(block.data?.html);
            break;
          case 'image':
            images += 1;
            break;
          case 'productList':
            words += 12 * (Array.isArray(block.data?.products) ? block.data.products.length : 0);
            break;
          default:
            break;
        }
      }
    }
  }

  let seconds = (words / wpm) * 60;
  for (let i = 1; i <= images; i += 1) {
    seconds += Math.max(3, secondsPerImage - (i - 1));
  }

  return Math.max(1, Math.ceil(seconds / 60));
}
