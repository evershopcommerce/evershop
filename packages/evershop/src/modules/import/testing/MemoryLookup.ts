import type {
  FieldDescriptor,
  MetafieldDefinition
} from '../../../lib/metafield/types.js';
import { toStoredMetafield } from '../adapters/metafieldCheck.js';
import type {
  Lookup,
  MetafieldFieldFixture,
  NamedRecord,
  StoredMetafield,
  StoredAttribute,
  StoredCategory,
  StoredProduct,
  StoredRedirect,
  StoredVariantGroup,
  StoreFixture
} from '../services/ports/lookup.js';
import type { ImportEntity } from '../services/types.js';

/** A product in the memory store: what `StoredProduct` is built from. */
export interface MemoryProduct {
  id: number;
  uuid: string;
  sku: string;
  urlKey: string;
  status: 0 | 1;
  attributeGroupId: number;
  packageId: number | null;
  noShippingRequired: boolean;
  categoryUrlKey: string | null;
  variantGroupId: number | null;
  /** Attribute code → the option texts (a list for a multiselect) or the text. */
  values: Record<string, string>;
  metaData: Record<string, Record<string, unknown>>;
}

interface MemoryAttribute extends StoredAttribute {
  /** option id → text */
  options: Map<number, string>;
}

const lower = (text: string) => text.trim().toLowerCase();

/**
 * TEST-ONLY. A `Lookup` over a store described as data (`StoreFixture`). It
 * records what it was asked, so a test can check that the questions are batched.
 */
export class MemoryLookup implements Lookup {
  /** Every call of `categories`, with the keys it was given. */
  readonly categoryCalls: string[][] = [];

  /** How many times each question was asked (batching: not once per row). */
  readonly calls: Record<string, number> = {};

  /**
   * The categories of the store by `url_key`. `MemoryServices` writes here, so a
   * category it creates is found by the next question.
   */
  readonly stored = new Map<string, StoredCategory>();

  /** The products by SKU. `MemoryServices` writes here. */
  readonly products_ = new Map<string, MemoryProduct>();

  readonly attributeGroups_: Array<{
    id: number;
    name: string;
    attributes: Set<string>;
  }> = [];

  readonly packages_: Array<NamedRecord & { isDefault: boolean }> = [];

  readonly taxClasses_: NamedRecord[] = [];

  readonly attributes_: MemoryAttribute[] = [];

  readonly variantGroups_ = new Map<
    number,
    { id: number; uuid: string; attributeGroupId: number; axes: string[] }
  >();

  readonly redirects_ = new Map<string, StoredRedirect>();

  readonly rewrites_ = new Set<string>();

  private readonly reserved: ReadonlySet<string>;

  private readonly definitions: Partial<
    Record<ImportEntity, ReadonlySet<string>>
  >;

  private readonly fields: Partial<
    Record<ImportEntity, Map<string, StoredMetafield>>
  > = {};

  private nextOptionId = 1;

  constructor(fixture: StoreFixture = {}) {
    (fixture.categories ?? []).forEach((category, index) => {
      this.stored.set(category.urlKey, {
        id: category.id ?? index + 1,
        uuid: category.uuid ?? `uuid-${category.urlKey}`,
        urlKey: category.urlKey,
        parentUrlKey: category.parentUrlKey ?? null,
        name: category.name ?? category.urlKey,
        status: category.status ?? 1,
        metaData: category.metaData ?? {}
      });
    });
    this.reserved = new Set(fixture.reservedUrlKeys ?? []);

    // The definitions: plain text fields from `metafields`, the others from
    // `metafieldDefinitions`; the keys of both are the keys the header may name.
    const keys: Partial<Record<ImportEntity, Set<string>>> = {};
    const entities = new Set<ImportEntity>([
      ...(Object.keys(fixture.metafields ?? {}) as ImportEntity[]),
      ...(Object.keys(fixture.metafieldDefinitions ?? {}) as ImportEntity[])
    ]);
    for (const entity of entities) {
      const map = new Map<string, StoredMetafield>();
      for (const full of fixture.metafields?.[entity] ?? []) {
        const [namespace, key] = full.split('.');
        map.set(full, toStoredMetafield(definitionOf(entity, namespace, key)));
      }
      for (const field of fixture.metafieldDefinitions?.[entity] ?? []) {
        map.set(
          `${field.namespace}.${field.key}`,
          toStoredMetafield(
            definitionOf(entity, field.namespace, field.key, field)
          )
        );
      }
      this.fields[entity] = map;
      keys[entity] = new Set(map.keys());
    }
    this.definitions = keys;

    (fixture.attributeGroups ?? []).forEach((group, index) => {
      this.attributeGroups_.push({
        id: group.id ?? index + 1,
        name: group.name,
        attributes: new Set((group.attributes ?? []).map(lower))
      });
    });
    (fixture.packages ?? []).forEach((pack, index) => {
      this.packages_.push({
        id: pack.id ?? index + 1,
        name: pack.name,
        isDefault: pack.isDefault ?? false
      });
    });
    (fixture.taxClasses ?? []).forEach((taxClass, index) => {
      this.taxClasses_.push({
        id: taxClass.id ?? index + 1,
        name: taxClass.name
      });
    });
    (fixture.attributes ?? []).forEach((attribute, index) => {
      const options = new Map<number, string>();
      for (const text of attribute.options ?? []) {
        options.set(this.nextOptionId, text);
        this.nextOptionId += 1;
      }
      this.attributes_.push({
        id: attribute.id ?? index + 1,
        code: attribute.code,
        type: attribute.type ?? 'select',
        required: attribute.required ?? false,
        options
      });
    });
    (fixture.variantGroups ?? []).forEach((group, index) => {
      const id = group.id ?? index + 1;
      this.variantGroups_.set(id, {
        id,
        uuid: `uuid-vg-${group.label}`,
        attributeGroupId: this.groupId(group.attributeGroup),
        axes: group.axes
      });
    });
    const labelToId = new Map(
      (fixture.variantGroups ?? []).map((group, index) => [
        group.label,
        group.id ?? index + 1
      ])
    );
    (fixture.products ?? []).forEach((product, index) => {
      const packageName = product.package;
      this.products_.set(product.sku, {
        id: product.id ?? index + 1,
        uuid: product.uuid ?? `uuid-${product.sku}`,
        sku: product.sku,
        urlKey: product.urlKey ?? product.sku.toLowerCase(),
        status: product.status ?? 1,
        attributeGroupId: this.groupId(product.attributeGroup ?? 'Default'),
        packageId:
          packageName === undefined || packageName === null
            ? null
            : this.packages_.find((p) => lower(p.name) === lower(packageName))
                ?.id ?? null,
        noShippingRequired: product.noShippingRequired ?? false,
        categoryUrlKey: product.category ?? null,
        variantGroupId:
          product.variantGroup === undefined || product.variantGroup === null
            ? null
            : labelToId.get(product.variantGroup) ?? null,
        values: product.values ?? {},
        metaData: product.metaData ?? {}
      });
    });
    for (const redirect of fixture.redirects ?? []) {
      this.redirects_.set(redirect.from, {
        fromPath: redirect.from,
        entityUrn: redirect.entityUrn ?? null
      });
    }
    for (const path of fixture.rewritePaths ?? []) {
      this.rewrites_.add(path);
    }
  }

  private groupId(name: string): number {
    return (
      this.attributeGroups_.find((g) => lower(g.name) === lower(name))?.id ?? 0
    );
  }

  private count(question: string) {
    this.calls[question] = (this.calls[question] ?? 0) + 1;
  }

  async categories(
    urlKeys: readonly string[]
  ): Promise<Map<string, StoredCategory>> {
    this.categoryCalls.push([...urlKeys]);
    this.count('categories');
    const found = new Map<string, StoredCategory>();
    for (const key of urlKeys) {
      const category = this.stored.get(key);
      if (category) {
        // A copy: the caller must not change the store by holding the answer.
        found.set(key, { ...category });
      }
    }
    return found;
  }

  async reservedUrlKeys(): Promise<ReadonlySet<string>> {
    return this.reserved;
  }

  async metafieldKeys(entity: ImportEntity): Promise<ReadonlySet<string>> {
    return this.definitions[entity] ?? new Set();
  }

  async metafields(
    entity: ImportEntity
  ): Promise<ReadonlyMap<string, StoredMetafield>> {
    this.count('metafields');
    return this.fields[entity] ?? new Map();
  }

  async products(skus: readonly string[]): Promise<Map<string, StoredProduct>> {
    this.count('products');
    const found = new Map<string, StoredProduct>();
    for (const sku of skus) {
      const product = this.products_.get(sku);
      if (product) {
        found.set(sku, this.toStored(product));
      }
    }
    return found;
  }

  private toStored(product: MemoryProduct): StoredProduct {
    return {
      id: product.id,
      uuid: product.uuid,
      sku: product.sku,
      urlKey: product.urlKey,
      status: product.status,
      attributeGroupId: product.attributeGroupId,
      packageId: product.packageId,
      noShippingRequired: product.noShippingRequired,
      categoryUrlKey: product.categoryUrlKey,
      variantGroupId: product.variantGroupId,
      attributeCodes: Object.keys(product.values),
      metaData: JSON.parse(JSON.stringify(product.metaData))
    };
  }

  async productUrlKeyOwners(
    urlKeys: readonly string[]
  ): Promise<Map<string, string>> {
    this.count('productUrlKeyOwners');
    const owners = new Map<string, string>();
    const wanted = new Set(urlKeys);
    for (const product of this.products_.values()) {
      if (wanted.has(product.urlKey)) {
        owners.set(product.urlKey, product.sku);
      }
    }
    return owners;
  }

  private named(
    records: readonly NamedRecord[],
    names: readonly string[]
  ): Map<string, NamedRecord[]> {
    const found = new Map<string, NamedRecord[]>();
    for (const name of names) {
      const key = lower(name);
      const hits = records.filter((record) => lower(record.name) === key);
      if (hits.length > 0) {
        found.set(
          key,
          hits.map((hit) => ({ ...hit }))
        );
      }
    }
    return found;
  }

  async attributeGroups(names: readonly string[]) {
    this.count('attributeGroups');
    return this.named(this.attributeGroups_, names);
  }

  async packages(names: readonly string[]) {
    this.count('packages');
    return this.named(this.packages_, names);
  }

  async taxClasses(names: readonly string[]) {
    this.count('taxClasses');
    return this.named(this.taxClasses_, names);
  }

  async defaultPackage(): Promise<NamedRecord | null> {
    const pack = this.packages_.find((p) => p.isDefault);
    return pack ? { id: pack.id, name: pack.name } : null;
  }

  async attributes(
    codes: readonly string[]
  ): Promise<Map<string, StoredAttribute>> {
    this.count('attributes');
    const found = new Map<string, StoredAttribute>();
    for (const code of codes) {
      const hit = this.attributes_.find((a) => lower(a.code) === lower(code));
      if (hit) {
        found.set(lower(code), {
          id: hit.id,
          code: hit.code,
          type: hit.type,
          required: hit.required
        });
      }
    }
    return found;
  }

  async attributeGroupLinks(groupId: number): Promise<{
    linked: ReadonlySet<number>;
    required: StoredAttribute[];
  }> {
    this.count('attributeGroupLinks');
    const group = this.attributeGroups_.find((g) => g.id === groupId);
    const linked = new Set<number>();
    const required: StoredAttribute[] = [];
    for (const attribute of this.attributes_) {
      if (group?.attributes.has(lower(attribute.code))) {
        linked.add(attribute.id);
        if (attribute.required) {
          required.push({
            id: attribute.id,
            code: attribute.code,
            type: attribute.type,
            required: true
          });
        }
      }
    }
    return { linked, required };
  }

  async attributeOptions(
    attributeId: number,
    texts: readonly string[]
  ): Promise<Map<string, number[]>> {
    this.count('attributeOptions');
    const found = new Map<string, number[]>();
    const attribute = this.attributes_.find((a) => a.id === attributeId);
    if (!attribute) {
      return found;
    }
    for (const text of texts) {
      const key = lower(text);
      const ids = [...attribute.options]
        .filter(([, optionText]) => lower(optionText) === key)
        .map(([id]) => id);
      if (ids.length > 0) {
        found.set(key, ids);
      }
    }
    return found;
  }

  /** The text of an option by its id (the memory services write ids). */
  optionText(id: number): string | null {
    for (const attribute of this.attributes_) {
      const text = attribute.options.get(id);
      if (text !== undefined) return text;
    }
    return null;
  }

  /** The id of an option of an attribute by its text, for a test or a service. */
  optionId(code: string, text: string): number | null {
    const attribute = this.attributes_.find(
      (a) => lower(a.code) === lower(code)
    );
    if (!attribute) return null;
    for (const [id, optionText] of attribute.options) {
      if (lower(optionText) === lower(text)) return id;
    }
    return null;
  }

  async variantGroups(
    ids: readonly number[]
  ): Promise<Map<number, StoredVariantGroup>> {
    this.count('variantGroups');
    const found = new Map<number, StoredVariantGroup>();
    for (const id of ids) {
      const group = this.variantGroups_.get(id);
      if (!group) continue;
      found.set(id, {
        id,
        uuid: group.uuid,
        attributeGroupId: group.attributeGroupId,
        axisCodes: [...group.axes],
        members: [...this.products_.values()]
          .filter((product) => product.variantGroupId === id)
          .map((product) => ({
            sku: product.sku,
            packageId: product.packageId,
            options: Object.fromEntries(
              group.axes.map((code) => [
                code,
                product.values[code] === undefined
                  ? null
                  : this.optionId(code, product.values[code])
              ])
            )
          }))
      });
    }
    return found;
  }

  async redirects(
    paths: readonly string[]
  ): Promise<Map<string, StoredRedirect>> {
    this.count('redirects');
    const found = new Map<string, StoredRedirect>();
    for (const path of paths) {
      const redirect = this.redirects_.get(path);
      if (redirect) found.set(path, { ...redirect });
    }
    return found;
  }

  async rewritePaths(paths: readonly string[]): Promise<ReadonlySet<string>> {
    this.count('rewritePaths');
    return new Set(paths.filter((path) => this.rewrites_.has(path)));
  }
}

type FixtureField = {
  type?: MetafieldFieldFixture['type'];
  isList?: boolean;
  required?: boolean;
  validations?: MetafieldFieldFixture['validations'];
  subFields?: MetafieldFieldFixture[];
};

function subFieldOf(field: MetafieldFieldFixture): FieldDescriptor {
  return {
    key: field.key,
    name: field.key,
    type: field.type,
    isList: field.isList,
    required: field.required,
    validations: field.validations,
    subFields: field.subFields?.map(subFieldOf)
  };
}

// The definition of the store that a fixture entry describes.
function definitionOf(
  entity: ImportEntity,
  namespace: string,
  key: string,
  field: FixtureField = {}
): MetafieldDefinition {
  return {
    uuid: `uuid-${namespace}-${key}`,
    ownerType: entity,
    namespace,
    key,
    name: key,
    type: field.type ?? 'short_text',
    isList: field.isList ?? false,
    required: field.required ?? false,
    validations: field.validations ?? [],
    subFields: (field.subFields ?? []).map(subFieldOf),
    visibleToCustomer: false,
    position: 0
  };
}
