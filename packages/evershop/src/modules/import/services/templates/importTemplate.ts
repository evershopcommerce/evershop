import { CATEGORY_COLUMNS } from '../entities/category/categoryValidator.js';
import { CUSTOMER_COLUMNS } from '../entities/customer/customerValidator.js';
import { ADDRESS_VALUE_COLUMNS } from '../entities/customerAddress/customerAddressValidator.js';
import { PRODUCT_COLUMNS } from '../entities/product/productValidator.js';
import { csvLine } from '../report/csvWrite.js';
import type { ImportEntity } from '../types.js';

/** What a template needs to know about the store it is made for (§ 5). */
export interface TemplateStore {
  /** The code of every attribute: one `attr:` column each (products). */
  attributeCodes: readonly string[];
  /** The `namespace.key` of every custom field of the entity: one `metafield:` column each. */
  metafieldKeys: readonly string[];
  /** The merchant's name format, for the address columns. */
  nameFormat: 'single' | 'split';
}

const BOM = '﻿';

/**
 * The columns of the template of an entity: the fixed ones, then (for products)
 * one `attr:<code>` for each attribute of the store, then one
 * `metafield:<namespace>.<key>` for each custom field. An address file has the
 * name as `recipient`, or as `given_name` and `family_name`, by the name format.
 */
export function templateColumns(
  entity: ImportEntity,
  store: TemplateStore
): string[] {
  const metafields = [...store.metafieldKeys]
    .sort()
    .map((key) => `metafield:${key}`);
  switch (entity) {
    case 'category':
      return [...CATEGORY_COLUMNS, ...metafields];
    case 'product':
      return [
        ...PRODUCT_COLUMNS,
        ...[...store.attributeCodes].sort().map((code) => `attr:${code}`),
        ...metafields
      ];
    case 'customer':
      return [...CUSTOMER_COLUMNS, ...metafields];
    case 'customerAddress':
      return [
        'email',
        ...ADDRESS_VALUE_COLUMNS.filter((column) =>
          store.nameFormat === 'split'
            ? column !== 'recipient'
            : column !== 'given_name' && column !== 'family_name'
        ),
        'extra',
        'is_default'
      ];
    default:
      throw new Error(`There is no template for ${entity}`);
  }
}

// The cells of the example rows, by column. The keys are the reserved ones
// that the validators skip (ALL-18): uploading the template as it is imports
// nothing. The cells read as a model; they are never checked.
const EXAMPLES: Record<ImportEntity, Array<Record<string, string>>> = {
  category: [
    {
      url_key: 'example-category',
      name: 'Example category',
      status: '1',
      position: '1',
      description: 'Describe the category here.',
      meta_title: 'Example category',
      meta_description: 'A few words for search engines.',
      image: 'https://example.com/images/example-category.jpg'
    },
    {
      url_key: 'example-subcategory',
      name: 'Example subcategory',
      parent: 'example-category',
      status: '1',
      position: '1'
    }
  ],
  product: [
    {
      sku: 'EXAMPLE-SKU-1',
      name: 'Example product',
      url_key: 'example-product',
      status: '1',
      visibility: '1',
      price: '19.99',
      qty: '100',
      attribute_group: 'Default',
      package: 'Standard Box',
      no_shipping_required: '0',
      manage_stock: '1',
      stock_availability: '1',
      weight: '0.5',
      tax_class: 'Taxable Goods',
      short_description: 'One line about the product.',
      description: 'Describe the product here.',
      meta_title: 'Example product',
      meta_description: 'A few words for search engines.',
      images:
        'https://example.com/images/example-1.jpg|https://example.com/images/example-2.jpg'
    },
    {
      sku: 'EXAMPLE-SKU-2',
      name: 'Example virtual product',
      url_key: 'example-virtual-product',
      status: '1',
      visibility: '1',
      price: '9.00',
      qty: '0',
      attribute_group: 'Default',
      no_shipping_required: '1',
      manage_stock: '0',
      stock_availability: '1',
      tax_class: 'Taxable Goods',
      description: 'A product that is not shipped, such as a gift card.'
    }
  ],
  customer: [
    {
      email: 'example.customer@example.com',
      full_name: 'Example Customer',
      status: '1',
      group: 'Default'
    },
    {
      email: 'example.customer2@example.com',
      full_name: 'Another Example',
      status: '1'
    }
  ],
  customerAddress: [
    {
      email: 'example.customer@example.com',
      recipient: 'Example Customer',
      given_name: 'Example',
      family_name: 'Customer',
      address_line_1: '1 Market Street',
      address_line_2: 'Suite 200',
      locality: 'San Francisco',
      administrative_area: 'US-CA',
      postal_code: '94105',
      country: 'US',
      telephone: '415-555-0100',
      is_default: '1'
    },
    {
      email: 'example.customer@example.com',
      recipient: 'Example Customer',
      given_name: 'Example',
      family_name: 'Customer',
      address_line_1: 'Unter den Linden 77',
      locality: 'Berlin',
      postal_code: '10117',
      country: 'DE',
      telephone: '+4930123456',
      is_default: '0'
    }
  ]
};

/**
 * The template an admin downloads (D-13): a header row for this store and two
 * example rows with reserved keys. The file starts with a byte order mark, so
 * that a spreadsheet reads it as UTF-8; the reader tolerates it.
 */
export function buildTemplate(
  entity: ImportEntity,
  store: TemplateStore
): string {
  const columns = templateColumns(entity, store);
  const rows = EXAMPLES[entity].map((cells) =>
    csvLine(columns.map((column) => cells[column] ?? ''))
  );
  return BOM + csvLine(columns) + rows.join('');
}
