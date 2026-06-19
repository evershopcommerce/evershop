import sanitizeHtml from 'sanitize-html';

// Extend the default allowed attributes to preserve CSS classes on all tags
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'figure',
    'figcaption',
    'video',
    'source',
    'iframe'
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'style']
  }
};

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
 * For "raw" type blocks, `data.html` is sanitized via sanitize-html.
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
          block.data.html = sanitizeHtml(block.data.html, sanitizeOptions);
        }
      });
    });
  });
}

export { sanitizeRawHtml };
