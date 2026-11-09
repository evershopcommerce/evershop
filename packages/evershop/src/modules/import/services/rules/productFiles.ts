import { csvLine } from '../report/csvWrite.js';

/**
 * Small builders for the files of the product rule examples: a valid row with
 * one cell changed is how a rule is shown ("one cell broken, one issue").
 */
export const PRODUCT_COLUMNS = [
  'sku',
  'name',
  'url_key',
  'status',
  'visibility',
  'price',
  'qty',
  'attribute_group',
  'package',
  'no_shipping_required',
  'manage_stock',
  'stock_availability',
  'weight',
  'tax_class',
  'category',
  'short_description',
  'description',
  'meta_title',
  'meta_description',
  'images',
  'variant_group',
  'variant_axes',
  'redirect_from',
  'attr:color',
  'attr:size'
] as const;

export type ProductColumn = (typeof PRODUCT_COLUMNS)[number];

const VALID: Record<ProductColumn, string> = {
  sku: 'TSH-1',
  name: 'Classic Tee',
  url_key: 'classic-tee',
  status: '1',
  visibility: '1',
  price: '24.00',
  qty: '40',
  attribute_group: 'Default',
  package: 'Standard Box',
  no_shipping_required: '0',
  manage_stock: '1',
  stock_availability: '1',
  weight: '0.25',
  tax_class: 'Taxable Goods',
  category: 't-shirts',
  short_description: 'Organic cotton crew-neck tee.',
  description: 'Our everyday tee.',
  meta_title: 'Classic Tee',
  meta_description: 'Relaxed-fit organic cotton tee.',
  images: 'https://example.com/tee.jpg',
  variant_group: '',
  variant_axes: '',
  redirect_from: '',
  'attr:color': 'Black',
  'attr:size': 'S'
};

/** The header of the files of the examples. */
export const PRODUCT_HEADER = csvLine(PRODUCT_COLUMNS).trimEnd();

/** One data row. Without arguments, a valid row that creates `TSH-1`. */
export function productRow(
  values: Partial<Record<ProductColumn, string>> = {}
): string {
  return csvLine(
    PRODUCT_COLUMNS.map((column) => values[column] ?? VALID[column])
  ).trimEnd();
}

/** A file with the header of the examples and these rows (the first is row 2). */
export function productFile(...rows: string[]): string {
  return `${PRODUCT_HEADER}\n${rows.join('\n')}\n`;
}

/**
 * The store the examples run against: an attribute group with two attributes, a
 * default package, a tax class and a category. Nothing is stored as a product, so
 * a row creates.
 */
export const PRODUCT_STORE = {
  attributeGroups: [{ name: 'Default', attributes: ['color', 'size'] }],
  packages: [{ name: 'Standard Box', isDefault: true }],
  taxClasses: [{ name: 'Taxable Goods' }],
  attributes: [
    { code: 'color', type: 'select' as const, options: ['Black', 'White'] },
    { code: 'size', type: 'select' as const, options: ['S', 'M', 'L'] }
  ],
  categories: [{ urlKey: 't-shirts', name: 'T-shirts', status: 1 as const }],
  reservedUrlKeys: ['cart', 'checkout']
};

/** The same store with the product `TSH-1` stored: a row for it updates. */
export const PRODUCT_STORE_WITH_TEE = {
  ...PRODUCT_STORE,
  products: [
    {
      sku: 'TSH-1',
      urlKey: 'classic-tee',
      attributeGroup: 'Default',
      package: 'Standard Box',
      category: 't-shirts',
      values: { color: 'Black', size: 'S' }
    }
  ]
};
