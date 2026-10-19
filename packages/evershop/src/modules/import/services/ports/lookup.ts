import type { ImportEntity } from '../types.js';

/**
 * A custom-field definition, as far as the import needs it (§ 5.9): the type, the
 * sub-fields of a group, and a check that applies the validations and the
 * `required` of the store (core's own check, compiled once).
 */
export type MetafieldType =
  | 'short_text'
  | 'long_text'
  | 'rich_text'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'date'
  | 'color'
  | 'url'
  | 'group';

export interface MetafieldField {
  key: string;
  type: MetafieldType;
  isList: boolean;
  required: boolean;
  /** The defined sub-fields of a group (their own `subFields` for a nested group). */
  subFields: MetafieldField[];
}

export interface StoredMetafield extends MetafieldField {
  namespace: string;
  /**
   * Checks a value that was read from a cell, in the form the store keeps it, as
   * core does when it saves a product (`ok: false` carries the message). A blank
   * value is "not provided".
   */
  check(
    value: unknown
  ): { ok: true; value: unknown } | { ok: false; message: string };
}

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
  /** Custom fields: `{namespace: {key: value}}`, the whole stored set (§ 5.9). */
  metaData: Record<string, Record<string, unknown>>;
}

/** A customer as the store has it now (matched by e-mail, ignoring letter case). */
export interface StoredCustomer {
  id: number;
  /** What `updateCustomer` takes to name the customer. */
  uuid: string;
  /** As stored (its letter case may differ from the file's). */
  email: string;
  name: string;
  status: 0 | 1;
  groupId: number | null;
  /** Custom fields: `{namespace: {key: value}}`, the whole stored set (§ 5.9). */
  metaData: Record<string, Record<string, unknown>>;
}

/**
 * The password rules of the store, as core applies them (`verifyPassword`: the
 * minimum length and any rule an extension added). `ok: false` carries the
 * message of the first rule that refuses.
 */
export type PasswordCheck = (
  password: string
) => { ok: true } | { ok: false; message: string };

/** One problem core's address validation found: the field, the code, the translated message. */
export interface AddressProblem {
  field?: string;
  code: string;
  message: string;
}

/**
 * What the store decides about an address (§ 5.5): the normalization seam
 * (`customerAddressDataBeforeCreate`, which trims, upper-cases the country,
 * makes the telephone E.164 and composes the names), `validateAddress` for the
 * account surface, the countries the registry knows, and the extra fields
 * registered for a country. The engine keeps no list of its own.
 */
export interface AddressRules {
  isKnownCountry(code: string): boolean;
  /** The ids of the extra fields registered for the country (ADR-10). */
  extraIds(country: string): readonly string[];
  /** The seam: what core does to an address before it validates it. */
  normalize(address: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** `validateAddress` on an address that was normalized; no problem means valid. */
  check(address: Record<string, unknown>): Promise<AddressProblem[]>;
}

/** An address of a customer as stored: the columns as text, and the extras. */
export interface StoredAddress {
  id: number;
  /** The 14 shared columns; `''` where the column is empty. */
  fields: Record<string, string>;
  extra: Record<string, unknown> | null;
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
  /** The custom-field definitions of an entity, by `namespace.key`, with their checks. */
  metafields(
    entity: ImportEntity
  ): Promise<ReadonlyMap<string, StoredMetafield>>;

  /**
   * The stored customers for these e-mails (given in lower case). The e-mails
   * match ignoring letter case, and the unique index of the table does not, so
   * an e-mail can have more than one customer (§ 5.1): the caller decides.
   */
  customers(emails: readonly string[]): Promise<Map<string, StoredCustomer[]>>;
  /** Customer groups by name (the name has no unique index, ALL-21). */
  customerGroups(names: readonly string[]): Promise<Map<string, NamedRecord[]>>;
  /** The password rules of the store (CUS-05). */
  passwordCheck(): Promise<PasswordCheck>;
  /** The address rules of the store (§ 5.5). */
  addressRules(): Promise<AddressRules>;
  /**
   * The addresses stored for these customers (ids), to find out whether a row
   * written by a worker that died is already there (a resumed job).
   */
  customerAddresses(
    customerIds: readonly number[]
  ): Promise<Map<number, StoredAddress[]>>;

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
  /** The definitions that are plain text fields: `namespace.key`. */
  metafields?: Partial<Record<ImportEntity, string[]>>;
  /** Definitions with a type, a list, validations or sub-fields. */
  metafieldDefinitions?: Partial<
    Record<
      ImportEntity,
      Array<{
        namespace: string;
        key: string;
        type?: MetafieldType;
        isList?: boolean;
        required?: boolean;
        validations?: Array<{
          type: 'size' | 'range' | 'regexp' | 'choices';
          min?: number;
          max?: number;
          pattern?: string;
          values?: Array<string | number>;
        }>;
        subFields?: MetafieldFieldFixture[];
      }>
    >
  >;

  customers?: Array<{
    email: string;
    id?: number;
    uuid?: string;
    name?: string;
    status?: 0 | 1;
    /** The name of its group. */
    group?: string | null;
    metaData?: Record<string, Record<string, unknown>>;
  }>;
  customerGroups?: Array<{ name: string; id?: number }>;
  /** The addresses a customer (by e-mail) already has. */
  customerAddresses?: Array<{
    customer: string;
    fields: Record<string, string>;
    extra?: Record<string, unknown> | null;
  }>;
  /** The extra address fields registered for a country: their ids. */
  addressExtras?: Record<string, string[]>;
  /** The countries the store sells to ('all' by default; the sell-to setting). */
  addressSellTo?: string[];
  /** The shortest password the store accepts (core's default is 6). */
  passwordMinLength?: number;

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

/** A sub-field of a group in a fixture. */
export interface MetafieldFieldFixture {
  key: string;
  type: MetafieldType;
  isList?: boolean;
  required?: boolean;
  validations?: Array<{
    type: 'size' | 'range' | 'regexp' | 'choices';
    min?: number;
    max?: number;
    pattern?: string;
    values?: Array<string | number>;
  }>;
  subFields?: MetafieldFieldFixture[];
}
