/**
 * Address Format Registry — public types.
 *
 * Pure module: no runtime imports. Everything the server owns (settings, the
 * `addressSchema` processor hook, `translate`, the request locale, the store
 * country) reaches this library through `configureAddressRuntime` in
 * `runtime.ts`, never through an import of `modules/*`, `config` or the
 * registry. See specifications/11-address-format-registry-specification.md
 * § 3.2–§ 3.6 and § 3.10–§ 3.13.
 */

/** Google libaddressinput tokens. `%n` (line break) is layout, not a token. */
export type AddressToken = 'N' | 'O' | 'A' | 'D' | 'C' | 'S' | 'Z' | 'X';

/** Geographic levels below country, outermost first. */
export type AddressLevel =
  | 'administrative_area'
  | 'locality'
  | 'dependent_locality';

export type StateNameType =
  | 'province'
  | 'state'
  | 'prefecture'
  | 'area'
  | 'county'
  | 'emirate'
  | 'department'
  | 'district'
  | 'do_si'
  | 'island'
  | 'oblast'
  | 'parish'
  | 'region';

export type LocalityNameType = 'city' | 'district' | 'post_town' | 'suburb';

export type SublocalityNameType =
  | 'suburb'
  | 'district'
  | 'neighborhood'
  | 'village'
  | 'village_township'
  | 'townland'
  | 'ward';

export type ZipNameType = 'postal' | 'zip' | 'pin' | 'eircode';

export type NameOrder = 'given_first' | 'family_first';

/**
 * One country's address format, shaped like one record of Google's address
 * metadata so a package can copy upstream data without translating concepts.
 * `address_lines`, `name_order` and `telephone` are EverShop extensions.
 */
export interface AddressFormat {
  /** Native-script layout. `%n` is a line break; tokens on one line share a row. */
  fmt: string;
  /** Latin-script layout, when the native order differs (JP, CN, KR, HK, TW …). */
  lfmt?: string;
  /** Required tokens, as letters (e.g. 'ACSZ'). Presence and requiredness are independent. */
  require: string;
  /** Tokens printed uppercase on an envelope. Carried for formatters; never applied to inputs. */
  upper?: string;
  /** Postal code pattern, unanchored upstream; the library anchors it. */
  zip?: string;
  /** Postal code examples, comma-separated; the first becomes the placeholder. */
  zipex?: string;
  state_name_type?: StateNameType;
  locality_name_type?: LocalityNameType;
  sublocality_name_type?: SublocalityNameType;
  zip_name_type?: ZipNameType;
  /** Languages the record serves (Google's `languages`). The layout follows `lang`; `languages[0]` is only its fallback. */
  languages?: string[];
  /**
   * The language the record's native layout and region names are written in
   * (Google's `lang`, e.g. 'zh' for Hong Kong). A reader whose locale is this
   * language gets `fmt` and `Region.name`; any other reader gets `lfmt` when
   * the record has one and `Region.latinName` when the region has one.
   */
  lang?: string;
  /** EverShop extension: how many %A inputs to collect. Default 2. */
  address_lines?: 1 | 2 | 3;
  /** EverShop extension: order used to compose `recipient` from its parts. Default 'given_first'. */
  name_order?: NameOrder;
  /** EverShop extension: telephone rule for this country. `dialCode` is bundled; `pattern` is not. */
  telephone?: { pattern?: string; example?: string; dialCode?: string };
}

/** What `patchAddressFormat` accepts. Scalars replace; `fmt`/`lfmt` replace whole. */
export type AddressFormatPatch = Partial<AddressFormat>;

/** A geographic region at one level. `key` is what is stored. */
export interface Region {
  /** Codes where a country uses codes (US-CA), names elsewhere (Kowloon). */
  key: string;
  name: string;
  latinName?: string;
  /** The full ISO 3166-2 code (`US-CA`), when one exists. Both data sources write this form. */
  isoCode?: string;
  /** Hidden from selection, still resolvable by name (append-only rule). */
  retired?: boolean;
  /** For a retired region: the key of its successor, used for admin warnings only. */
  mergedInto?: string;
}

export interface RegionProvider {
  /** Levels this country enumerates, outermost first. Empty = all levels are free text. */
  levels: AddressLevel[];
  /**
   * Children of `parentPath` (keys of the outer levels). `[]` returns the top
   * level. `locale` lets a provider return names in the reader's language; the
   * default provider ignores it in the first release.
   */
  list(parentPath: string[], locale?: string): Region[] | Promise<Region[]>;
}

export interface Country {
  code: string;
  name: string;
}

/** The three address forms. Also the Area id suffix for a surface. */
export type AddressSurface = 'account' | 'shipping' | 'billing';

export type AddressFieldType =
  | 'text'
  | 'select'
  | 'tel'
  | 'textarea'
  | 'number'
  | 'email';

/** The 14 columns shared by customer_address, cart_address and order_address (plus `extra`). */
export type AddressColumn =
  | 'recipient'
  | 'given_name'
  | 'family_name'
  | 'organization'
  | 'address_line_1'
  | 'address_line_2'
  | 'address_line_3'
  | 'dependent_locality'
  | 'locality'
  | 'administrative_area'
  | 'postal_code'
  | 'sorting_code'
  | 'country'
  | 'telephone';

/** A column, or the id of a registered extra field (stored in `extra`). */
export type AddressFieldId = AddressColumn | (string & {});

export interface AddressPattern {
  regex: string;
  /** English source string, translated with the field label interpolated as `${field}`. */
  messageKey: string;
}

export interface ResolvedAddressField {
  /** The column, or the extra id. */
  id: AddressFieldId;
  /** Absent for `country`, `telephone` and extras. */
  token?: AddressToken;
  type: AddressFieldType;
  /**
   * Typed label. The client maps it to an English source string (`ADDRESS_LABELS`)
   * and translates with `_()`. Values: 'recipient' | 'given_name' | 'family_name'
   * | 'organization' | 'address_line' | 'address_line_2' | 'address_line_3'
   * | 'telephone' | 'country' | StateNameType | LocalityNameType
   * | SublocalityNameType | ZipNameType | 'sorting_code' | 'extra'.
   */
  labelType: string;
  /** English source label, for extras only. */
  label?: string;
  required: boolean;
  pattern?: AddressPattern;
  placeholder?: string;
  /** Enumerated geographic level: options come from `regions(country, parentPath)`. */
  optionSource?: 'regions';
  /** The outer level whose value parameterises `optionSource` and whose change clears this field. */
  dependsOn?: AddressFieldId;
  /**
   * Row numbering: `country` is row 0, alone. The record's `fmt` lines are rows
   * 1..n, fields on one line sharing a row. `telephone` gets its own row after
   * the recipient's row. In split mode `given_name` and `family_name` share the
   * recipient's row. An extra gets its own row after its anchor's row, or after
   * the last postal row when it has no anchor.
   */
  row: number;
}

export interface ResolvedAddressSchema {
  /** '' when the DEFAULT record was resolved for no country. */
  country: string;
  locale: string;
  script: 'native' | 'latin';
  /** The fmt actually used, for client-side formatting. */
  format: string;
  /** From the record; the client needs it to preview a composed recipient. */
  nameOrder: NameOrder;
  /** Tokens to print uppercase; carried for formatters, never applied to inputs. */
  upper: AddressToken[];
  /** In display order. */
  fields: ResolvedAddressField[];
}

/** A non-postal field registered by an extension; values live in `extra`. */
export interface ExtraFieldDefinition {
  /** Must not collide with an `AddressColumn`. */
  id: string;
  type: AddressFieldType;
  /** English source string. */
  label: string;
  required?: boolean;
  pattern?: AddressPattern;
  placeholder?: string;
  /** Country scoping. Absent = every country. */
  countries?: string[];
  /** Which forms collect it. Absent = all three. The value still travels with the row. */
  surfaces?: AddressSurface[];
  /** Placement anchor; absent = after the last postal field. */
  after?: AddressFieldId;
}

/**
 * A database row of any of the three address tables, or an API payload about
 * to become one. Extra fields arrive as top-level keys in payloads and are
 * folded into `extra` by the services.
 */
export interface AddressRow {
  recipient?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  organization?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  address_line_3?: string | null;
  dependent_locality?: string | null;
  locality?: string | null;
  administrative_area?: string | null;
  postal_code?: string | null;
  sorting_code?: string | null;
  country?: string | null;
  telephone?: string | null;
  extra?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/** The eight merchant settings (§ 3.13). Stored as flat `setting` rows, injected here. */
export interface AddressSettings {
  nameFormat: 'single' | 'split';
  telephone: 'required' | 'optional' | 'hidden';
  organization: 'hidden' | 'optional' | 'required';
  addressLine2: 'shown' | 'hidden';
  addressLine3: 'enabled' | 'disabled';
  /** Tighten only: `required` may be set on a postal field; `asCountry` is the default. */
  required: Partial<Record<AddressColumn, 'asCountry' | 'required'>>;
  /** 'none' | 'store' | an ISO 3166-1 alpha-2 code. */
  defaultCountry: string;
  /** 'all' or a list of ISO 3166-1 alpha-2 codes. */
  sellToCountries: 'all' | string[];
}

export interface AddressError {
  field?: AddressFieldId;
  code: string;
  /** Already translated when returned by `validateAddress`. */
  message: string;
}

export interface AddressValidationRule {
  id: string;
  func: (
    address: AddressRow,
    schema: ResolvedAddressSchema
  ) => boolean | Promise<boolean>;
  /** `message` is an English source string, translated on return with `${field}` interpolated. */
  error: { field?: AddressFieldId; code: string; message: string };
}

export interface ValidateAddressOptions {
  locale?: string;
  /** The stored row on update. Absent on create. Drives the split-name rule. */
  previous?: AddressRow;
  /** Drives the sell-to check: account and billing use the list, shipping the list ∩ zone countries. */
  surface?: AddressSurface;
}

/** Display strings for one row, region names already resolved. */
export interface ResolvedNames {
  administrativeArea?: string;
  locality?: string;
  dependentLocality?: string;
  country?: string;
}

/** Consumer-neutral shape integrations map from; they keep their own field names. */
export interface IntegrationAddress {
  recipient: string;
  givenName?: string;
  familyName?: string;
  organization?: string;
  /** Non-empty address lines in order. */
  lines: string[];
  dependentLocality?: string;
  locality?: string;
  administrativeArea?: { key: string; name: string; isoSuffix?: string };
  postalCode?: string;
  sortingCode?: string;
  country: string;
  telephone?: string;
}

/** What the server injects once from a module bootstrap. The default runtime is pure. */
export interface AddressRuntime {
  getSettings(): AddressSettings;
  /** The `addressSchema` processor hook. Default: identity. */
  applyHook(
    schema: ResolvedAddressSchema,
    context: { country: string; locale: string; surface?: AddressSurface }
  ): ResolvedAddressSchema;
  /** `translate(text, values)`; default: interpolate only. */
  translate(text: string, values?: Record<string, string>): string;
  /** The active request locale; default 'en'. */
  getLocale(): string;
  /** The store's own country, for `defaultCountry: 'store'`; default undefined. */
  getStoreCountry(): string | undefined;
  /** Countries covered by at least one shipping zone, for the SHIPPING scope; default: none known → sell-to list as is. */
  getZoneCountries(): string[] | undefined;
}
