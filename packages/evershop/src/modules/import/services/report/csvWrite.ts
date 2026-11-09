const NEEDS_QUOTES = /[",\r\n]/;

/**
 * One cell of a CSV file: wrapped in quotes, with each quote written twice, when
 * it holds a comma, a quote or a line break; otherwise as it is. What the reader
 * (`readCsv`) takes out of the result is the text that went in.
 */
export function csvCell(text: string): string {
  return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row of a CSV file, with the line ending of the files Excel writes. */
export function csvLine(cells: readonly string[]): string {
  return `${cells.map(csvCell).join(',')}\r\n`;
}
