import type { EditorRow } from '../cells/description.js';

/**
 * What the category services take, in the form they want it (§ 4.1): numbers as
 * strings where the core pattern checks strings, ids as strings of digits. Only
 * the fields that are given are present: on an update a missing field stays as
 * it is.
 */
export interface CategoryWrite {
  name?: string;
  url_key?: string;
  status?: 0 | 1;
  position?: string;
  description?: EditorRow[];
  meta_title?: string;
  meta_description?: string;
  /** The path that `uploadFile` returned. */
  image?: string;
  /** The `category_id` of the parent, as a string of digits. */
  parent_id?: string;
  /**
   * The whole set of custom fields (§ 5.9): core REPLACES the stored set on a
   * save, so an update sends the stored values with the cells laid over them.
   */
  metafields?: Record<string, Record<string, unknown>>;
}

/**
 * What the product services take, in the form they want it (§ 4.1): the numbers
 * the core patterns check as strings, ids as strings of digits, `0` or `1` for
 * the flags (and `no_shipping_required` as a number, never the text "0"). Only
 * the fields that are given are present: on an update a missing field stays.
 */
export interface ProductWrite {
  sku?: string;
  name?: string;
  url_key?: string;
  status?: 0 | 1;
  visibility?: 0 | 1;
  price?: string;
  weight?: string;
  qty?: string;
  manage_stock?: 0 | 1;
  stock_availability?: 0 | 1;
  no_shipping_required?: 0 | 1;
  /** The attribute group, as a string of digits. */
  group_id?: string;
  package_id?: string;
  tax_class?: string;
  category_id?: string;
  short_description?: string;
  description?: EditorRow[];
  meta_title?: string;
  meta_description?: string;
  /** The paths that `uploadFile` returned; the first is the main image. */
  images?: string[];
  /**
   * The attributes: the text of a text attribute, the id of the option of a
   * select, the ids of the options of a multiselect (as strings of digits).
   */
  attributes?: Array<{ attribute_code: string; value: string | string[] }>;
  /** The whole set of custom fields, as for a category. */
  metafields?: Record<string, Record<string, unknown>>;
}

/**
 * The writes: the existing core services behind one object (§ 4.5, point 2), so
 * that a test replaces all of them. An error they throw is a failed row, and the
 * run goes on. The real one is made from `createCategory` and `updateCategory`;
 * the test doubles are `MemoryServices` and `RecordingServices`.
 *
 * Each call is one short transaction, owned by the service.
 */
export interface EntityServices {
  createCategory(input: CategoryWrite): Promise<{ id: number; uuid: string }>;
  updateCategory(uuid: string, input: CategoryWrite): Promise<void>;

  createProduct(input: ProductWrite): Promise<{ id: number; uuid: string }>;
  updateProduct(uuid: string, input: ProductWrite): Promise<void>;
  /**
   * A variant group for products of an attribute group, with these axes (G1).
   * The axes are stored in the order the database gives them.
   */
  createVariantGroup(input: {
    attributeGroupId: number;
    axisCodes: string[];
  }): Promise<{ id: number; uuid: string }>;
  /** Puts a product in a variant group (G1); the package converges. */
  addVariantItem(groupUuid: string, productUuid: string): Promise<void>;
  /**
   * The old addresses of a product, written as 301 redirects to its own path
   * (G4, `source = 'import'`). A path that is already a redirect of the product
   * is written again.
   */
  recordRedirects(productUuid: string, fromPaths: string[]): Promise<void>;
}
