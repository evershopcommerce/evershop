import type { ImportEntity } from '../types.js';

/** A category as the store has it now (the merged state for an update). */
export interface StoredCategory {
  /** `category_id`: what a child gives as its `parent_id`. */
  id: number;
  /** What `updateCategory` takes to name the category. */
  uuid: string;
  urlKey: string;
  /** The `url_key` of its parent, or null at the top level. */
  parentUrlKey: string | null;
  name: string;
  status: 0 | 1;
}

/** The types of attribute a product can have a value for (`attribute.type`). */
export type AttributeType =
  | 'select'
  | 'multiselect'
  | 'text'
  | 'textarea'
  | 'date'
  | 'datetime';

export interface StoredAttribute {
  id: number;
  code: string;
  type: AttributeType;
  /** `is_required`: the admin form wants a value (PRD-25). */
  required: boolean;
}

/** An attribute group, a package or a tax class: a named record. */
export interface NamedRecord {
  id: number;
  name: string;
}

/**
 * A product as the store has it now: what the rules need to judge a row on the
 * merged record (stored record overlaid with the cells of the row), and what an
 * update needs to name it.
 */
export interface StoredProduct {
  id: number;
  /** What `updateProduct` takes to name the product. */
  uuid: string;
  sku: string;
  urlKey: string;
  status: 0 | 1;
  /** The attribute group (`product.group_id`). */
  attributeGroupId: number;
  packageId: number | null;
  noShippingRequired: boolean;
  /** The `url_key` of its category, or null. */
  categoryUrlKey: string | null;
  /** `product.variant_group_id`, or null when it is in no group. */
  variantGroupId: number | null;
  /** The codes of the attributes it has a value for (PRD-25, PRD-26). */
  attributeCodes: string[];
  /** Custom fields: `{namespace: {key: value}}`, the whole stored set (§ 5.9). */
  metaData: Record<string, Record<string, unknown>>;
}

/** A variant group as stored, with its members (PRD-16, PRD-18, PRD-19). */
export interface StoredVariantGroup {
  id: number;
  uuid: string;
  attributeGroupId: number;
  /** The axes, as the database stores them (not in the order of a file). */
  axisCodes: string[];
  members: Array<{
    sku: string;
    packageId: number | null;
    /** The option the member has for each axis code (null: none). */
    options: Record<string, number | null>;
  }>;
}

/** Who owns a path in `url_redirect` (PRD-27). */
export interface StoredRedirect {
  fromPath: string;
  /** `entity_urn`, or null for a redirect that no entity owns. */
  entityUrn: string | null;
}

/**
 * Read-only, batched questions about the store (§ 4.5, point 2). The stages ask
 * through this port and never touch the database. The real one is `PgLookup`,
 * the test double is `MemoryLookup`. Names are matched exactly after trimming,
 * ignoring letter case (§ 5.1) and come back under their lower-case form.
 */
export interface Lookup {
  /**
   * The stored categories for these `url_key`s. A key that is not stored is
   * missing from the map.
   */
  categories(urlKeys: readonly string[]): Promise<Map<string, StoredCategory>>;
  /**
   * The single-segment storefront routes and the enabled locale codes that a
   * `url_key` must not equal (CAT-08, PRD-22).
   */
  reservedUrlKeys(): Promise<ReadonlySet<string>>;
  /** The `namespace.key` of every custom-field definition of an entity (ALL-08). */
  metafieldKeys(entity: ImportEntity): Promise<ReadonlySet<string>>;

  /** The stored products for these SKUs (matched exactly). */
  products(skus: readonly string[]): Promise<Map<string, StoredProduct>>;
  /**
   * For these `url_key`s, the SKU of the product that has it (PRD-21). A
   * `url_key` nobody has is missing from the map.
   */
  productUrlKeyOwners(urlKeys: readonly string[]): Promise<Map<string, string>>;
  /**
   * Attribute groups, packages and tax classes by name. Only the package name
   * is unique in the database, so an attribute group or a tax class can answer
   * with more than one record (ALL-21).
   */
  attributeGroups(
    names: readonly string[]
  ): Promise<Map<string, NamedRecord[]>>;
  packages(names: readonly string[]): Promise<Map<string, NamedRecord[]>>;
  taxClasses(names: readonly string[]): Promise<Map<string, NamedRecord[]>>;
  /** The package with `is_default` set, or null (D-25). */
  defaultPackage(): Promise<NamedRecord | null>;
  /** The attributes with these codes (matched ignoring letter case, by lower-case code). */
  attributes(codes: readonly string[]): Promise<Map<string, StoredAttribute>>;
  /**
   * The attributes that are linked to an attribute group, with the ones that are
   * required (PRD-11, PRD-25).
   */
  attributeGroupLinks(groupId: number): Promise<{
    linked: ReadonlySet<number>;
    required: StoredAttribute[];
  }>;
  /**
   * The option ids of an attribute for these texts, matched ignoring letter
   * case (PRD-12). A text that has no option is missing; one that has several
   * answers with all of them (ALL-21).
   */
  attributeOptions(
    attributeId: number,
    texts: readonly string[]
  ): Promise<Map<string, number[]>>;
  /** The variant groups with these ids, with their members. */
  variantGroups(
    ids: readonly number[]
  ): Promise<Map<number, StoredVariantGroup>>;
  /** The redirects that sit on these paths (PRD-27). */
  redirects(paths: readonly string[]): Promise<Map<string, StoredRedirect>>;
  /** Those of these paths that are the request path of a live `url_rewrite` row. */
  rewritePaths(paths: readonly string[]): Promise<ReadonlySet<string>>;
}

/**
 * The store described as plain data. `MemoryLookup` is built from it, and a rule
 * example (§ 4.5, point 3) carries one, so an example needs no test double.
 */
export interface StoreFixture {
  categories?: Array<
    Partial<Omit<StoredCategory, 'urlKey'>> & { urlKey: string }
  >;
  reservedUrlKeys?: string[];
  metafields?: Partial<Record<ImportEntity, string[]>>;

  attributeGroups?: Array<{
    name: string;
    id?: number;
    /** The codes of the attributes linked to the group. */
    attributes?: string[];
  }>;
  packages?: Array<{ name: string; id?: number; isDefault?: boolean }>;
  taxClasses?: Array<{ name: string; id?: number }>;
  attributes?: Array<{
    code: string;
    id?: number;
    type?: AttributeType;
    required?: boolean;
    /** Option texts (for `select` and `multiselect`). */
    options?: string[];
  }>;
  products?: Array<{
    sku: string;
    id?: number;
    uuid?: string;
    urlKey?: string;
    status?: 0 | 1;
    /** The name of its attribute group. */
    attributeGroup?: string;
    /** The name of its package. */
    package?: string | null;
    noShippingRequired?: boolean;
    category?: string | null;
    /** The label of the stored variant group it is in (see `variantGroups`). */
    variantGroup?: string | null;
    /** The option text it has for each attribute code (`|` for a list). */
    values?: Record<string, string>;
    metaData?: Record<string, Record<string, unknown>>;
  }>;
  variantGroups?: Array<{
    label: string;
    id?: number;
    attributeGroup: string;
    /** The axis codes, as the database stores them. */
    axes: string[];
  }>;
  redirects?: Array<{ from: string; entityUrn?: string | null }>;
  rewritePaths?: string[];
}
