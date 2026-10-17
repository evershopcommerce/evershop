/**
 * Small builders for the files of the category rule examples: a valid row with
 * one cell changed is how a rule is shown ("one cell broken, one issue").
 */
export const CATEGORY_COLUMNS = [
  'url_key',
  'name',
  'parent',
  'status',
  'position',
  'description',
  'meta_title',
  'meta_description',
  'image'
] as const;

type CategoryColumn = (typeof CATEGORY_COLUMNS)[number];

const VALID: Record<CategoryColumn, string> = {
  url_key: 'women',
  name: 'Women',
  parent: '',
  status: '1',
  position: '0',
  description: 'Clothes for women',
  meta_title: 'Women',
  meta_description: 'Clothes for women',
  image: 'https://example.com/women.jpg'
};

/** One data row. Without arguments, a valid row that creates `women`. */
export function categoryRow(
  values: Partial<Record<CategoryColumn, string>> = {}
): string {
  return CATEGORY_COLUMNS.map((column) => values[column] ?? VALID[column]).join(
    ','
  );
}

/** A file with the header of the template and these rows (the first is row 2). */
export function categoryFile(...rows: string[]): string {
  return `${CATEGORY_COLUMNS.join(',')}\n${rows.join('\n')}\n`;
}

/** The store of an update: `women` exists, so a row for it updates and creates nothing. */
export const STORE_WITH_WOMEN = {
  categories: [{ urlKey: 'women', name: 'Women', status: 1 as const }]
};
