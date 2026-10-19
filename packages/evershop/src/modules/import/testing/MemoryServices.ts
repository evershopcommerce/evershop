import type {
  CategoryWrite,
  CustomerWrite,
  EntityServices,
  ProductWrite
} from '../services/ports/services.js';
import type { MemoryLookup, MemoryProduct } from './MemoryLookup.js';

const BCRYPT_HASH = /^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/;

/** The error PostgreSQL gives for a unique constraint. */
function uniqueViolation(constraint: string, value: string): Error {
  return Object.assign(
    new Error(
      `duplicate key value violates unique constraint "${constraint}": ${value}`
    ),
    { code: '23505', constraint }
  );
}

/**
 * TEST-ONLY. The category services over the same store that `MemoryLookup`
 * answers from, so a category that is created is found by the next question. It
 * keeps the rules that matter to the writer: a unique `url_key`, a parent that
 * must exist, a name and a `url_key` to create, and the id and uuid of a category.
 */
export class MemoryServices implements EntityServices {
  /** What each category has been given, merged over its updates, by uuid. */
  readonly written = new Map<string, CategoryWrite>();

  /** What each product has been given, merged over its updates, by uuid. */
  readonly writtenProducts = new Map<string, ProductWrite>();

  /** The images of each product, by uuid (the last set that was written). */
  readonly images = new Map<string, string[]>();

  /** The old addresses written for each product, by uuid. */
  readonly redirects = new Map<string, string[]>();

  /** The redirect rows, by old address: what `url_redirect` would hold. */
  readonly redirectRows = new Map<
    string,
    { toPath: string; statusCode: 301 | 302; source: string; entityUrn: string }
  >();

  /** The password that nobody knows, one for all the accounts made without one. */
  readonly unusableHash = 'memory-unusable-password-hash';

  /** How each customer's password was given, by uuid (nothing is hashed here). */
  readonly customerPasswords = new Map<
    string,
    { kind: 'plain' | 'hash' | 'none'; value: string }
  >();

  constructor(private readonly store: MemoryLookup) {}

  private byId(id: string) {
    return [...this.store.stored.values()].find(
      (category) => String(category.id) === id
    );
  }

  async createCategory(
    input: CategoryWrite
  ): Promise<{ id: number; uuid: string }> {
    if (!input.name) throw new Error('Category name is required');
    if (!input.url_key) throw new Error('URL key is required');
    if (input.status === undefined) {
      // The column is NOT NULL with no default, as in the real table.
      throw Object.assign(
        new Error('null value in column "status" violates not-null constraint'),
        { code: '23502' }
      );
    }
    if (this.store.stored.has(input.url_key)) {
      throw uniqueViolation('CATEGORY_URL_KEY_UNIQUE', input.url_key);
    }
    let parentUrlKey: string | null = null;
    if (input.parent_id !== undefined) {
      const parent = this.byId(input.parent_id);
      if (!parent) throw new Error('Parent category not found');
      parentUrlKey = parent.urlKey;
    }
    const id =
      Math.max(0, ...[...this.store.stored.values()].map((c) => c.id)) + 1;
    // The shape of a real uuid, as the database gives.
    const uuid = `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
    this.store.stored.set(input.url_key, {
      id,
      uuid,
      urlKey: input.url_key,
      parentUrlKey,
      name: input.name,
      status: input.status,
      metaData: input.metafields ? structuredClone(input.metafields) : {}
    });
    this.written.set(uuid, { ...input });
    return { id, uuid };
  }

  async updateCategory(uuid: string, input: CategoryWrite): Promise<void> {
    const category = [...this.store.stored.values()].find(
      (candidate) => candidate.uuid === uuid
    );
    if (!category) throw new Error('Category not found');
    if (input.parent_id !== undefined) {
      const parent = this.byId(input.parent_id);
      if (!parent) throw new Error('Parent category not found');
      category.parentUrlKey = parent.urlKey;
    }
    if (input.name !== undefined) category.name = input.name;
    if (input.status !== undefined) category.status = input.status;
    // Core replaces the whole set of custom fields on a save.
    if (input.metafields !== undefined) {
      category.metaData = structuredClone(input.metafields);
    }
    this.written.set(uuid, { ...this.written.get(uuid), ...input });
  }

  // ---- products ---------------------------------------------------------

  private productByUuid(uuid: string): MemoryProduct | undefined {
    return [...this.store.products_.values()].find((p) => p.uuid === uuid);
  }

  private groupRecord(id: string | undefined) {
    return this.store.attributeGroups_.find((g) => String(g.id) === id);
  }

  async createProduct(
    input: ProductWrite
  ): Promise<{ id: number; uuid: string }> {
    for (const field of [
      'name',
      'url_key',
      'sku',
      'qty',
      'price',
      'group_id'
    ] as const) {
      if (!input[field]) {
        throw new Error(`${field} is required`);
      }
    }
    if (input.status === undefined || input.visibility === undefined) {
      throw new Error('status and visibility are required');
    }
    if (!input.no_shipping_required && !input.package_id) {
      throw new Error('A package is required for shippable products');
    }
    const sku = input.sku as string;
    const urlKey = input.url_key as string;
    if (this.store.products_.has(sku)) {
      throw new Error('This SKU is already used by another product');
    }
    if ([...this.store.products_.values()].some((p) => p.urlKey === urlKey)) {
      throw new Error('This URL key is already used by another product');
    }
    const group = this.groupRecord(input.group_id);
    if (!group) throw new Error('Attribute group not found');
    const id =
      Math.max(0, ...[...this.store.products_.values()].map((p) => p.id)) + 1;
    const uuid = `00000000-0000-4000-9000-${String(id).padStart(12, '0')}`;
    const category = input.category_id
      ? [...this.store.stored.values()].find(
          (c) => String(c.id) === input.category_id
        )
      : undefined;
    const product: MemoryProduct = {
      id,
      uuid,
      sku,
      urlKey,
      status: input.status,
      attributeGroupId: group.id,
      packageId: input.no_shipping_required
        ? null
        : input.package_id
        ? Number(input.package_id)
        : null,
      noShippingRequired: Boolean(input.no_shipping_required),
      categoryUrlKey: category?.urlKey ?? null,
      variantGroupId: null,
      values: {},
      metaData: input.metafields ? structuredClone(input.metafields) : {}
    };
    this.applyAttributes(product, input);
    this.store.products_.set(sku, product);
    this.writtenProducts.set(uuid, { ...input });
    if (input.images) this.images.set(uuid, [...input.images]);
    return { id, uuid };
  }

  private applyAttributes(product: MemoryProduct, input: ProductWrite): void {
    for (const attribute of input.attributes ?? []) {
      const known = this.store.attributes_.find(
        (a) => a.code.toLowerCase() === attribute.attribute_code.toLowerCase()
      );
      if (!known) continue;
      if (known.type === 'select' || known.type === 'multiselect') {
        const ids = Array.isArray(attribute.value)
          ? attribute.value
          : [attribute.value];
        const texts = ids
          .map((id) => this.store.optionText(Number(id)))
          .filter((text): text is string => text !== null);
        if (texts.length > 0) product.values[known.code] = texts.join('|');
      } else {
        product.values[known.code] = String(attribute.value);
      }
    }
  }

  async updateProduct(uuid: string, input: ProductWrite): Promise<void> {
    const product = this.productByUuid(uuid);
    if (!product) throw new Error('Requested product not found');
    if (input.name !== undefined || input.url_key !== undefined) {
      if (
        input.url_key !== undefined &&
        [...this.store.products_.values()].some(
          (p) => p.urlKey === input.url_key && p.uuid !== uuid
        )
      ) {
        throw new Error('This URL key is already used by another product');
      }
    }
    if (input.url_key !== undefined) product.urlKey = input.url_key;
    if (input.status !== undefined) product.status = input.status;
    if (input.group_id !== undefined) {
      if (product.variantGroupId !== null) {
        throw new Error(
          'Cannot change the attribute group of a product that has variants'
        );
      }
      const group = this.groupRecord(input.group_id);
      if (!group) throw new Error('Attribute group not found');
      product.attributeGroupId = group.id;
    }
    if (input.no_shipping_required !== undefined) {
      product.noShippingRequired = Boolean(input.no_shipping_required);
      if (input.no_shipping_required) product.packageId = null;
    }
    if (input.package_id !== undefined && !input.no_shipping_required) {
      product.packageId = Number(input.package_id);
    }
    if (input.category_id !== undefined) {
      const category = [...this.store.stored.values()].find(
        (c) => String(c.id) === input.category_id
      );
      product.categoryUrlKey = category?.urlKey ?? null;
    }
    this.applyAttributes(product, input);
    // Core replaces the whole set of custom fields on a save.
    if (input.metafields !== undefined) {
      product.metaData = structuredClone(input.metafields);
    }
    this.writtenProducts.set(uuid, {
      ...this.writtenProducts.get(uuid),
      ...input
    });
    if (input.images) this.images.set(uuid, [...input.images]);
    // An update of a member copies the shared fields to its siblings (§ 5.3).
    if (product.variantGroupId !== null) {
      for (const sibling of this.store.products_.values()) {
        if (sibling.variantGroupId === product.variantGroupId) {
          if (input.category_id !== undefined) {
            sibling.categoryUrlKey = product.categoryUrlKey;
          }
          if (input.no_shipping_required !== undefined) {
            sibling.noShippingRequired = product.noShippingRequired;
          }
          if (input.package_id !== undefined) {
            sibling.packageId = product.packageId;
          }
        }
      }
    }
  }

  async createVariantGroup(input: {
    attributeGroupId: number;
    axisCodes: string[];
  }): Promise<{ id: number; uuid: string }> {
    if (input.axisCodes.length === 0) throw new Error('No attributes provided');
    if (input.axisCodes.length > 5) {
      throw new Error('We only support up to 5 attributes');
    }
    const group = this.store.attributeGroups_.find(
      (g) => g.id === input.attributeGroupId
    );
    for (const code of input.axisCodes) {
      const attribute = this.store.attributes_.find(
        (a) => a.code.toLowerCase() === code.toLowerCase()
      );
      if (!attribute || attribute.type !== 'select') {
        throw new Error('Attribute must be of type select');
      }
      if (!group?.attributes.has(code.toLowerCase())) {
        throw new Error('Attribute must be assigned to the group');
      }
    }
    const id = Math.max(0, ...this.store.variantGroups_.keys()) + 1;
    const uuid = `00000000-0000-4000-a000-${String(id).padStart(12, '0')}`;
    this.store.variantGroups_.set(id, {
      id,
      uuid,
      attributeGroupId: input.attributeGroupId,
      axes: input.axisCodes.map((code) => {
        return (
          this.store.attributes_.find(
            (a) => a.code.toLowerCase() === code.toLowerCase()
          )?.code ?? code
        );
      })
    });
    return { id, uuid };
  }

  async addVariantItem(groupUuid: string, productUuid: string): Promise<void> {
    const group = [...this.store.variantGroups_.values()].find(
      (g) => g.uuid === groupUuid
    );
    if (!group) throw new Error('Invalid variant group');
    const product = this.productByUuid(productUuid);
    if (!product || product.attributeGroupId !== group.attributeGroupId) {
      throw new Error(
        'The product is either not exist or using different attribute group'
      );
    }
    product.variantGroupId = group.id;
    const member = [...this.store.products_.values()].find(
      (p) =>
        p.variantGroupId === group.id &&
        p.id !== product.id &&
        p.packageId !== null
    );
    if (member) {
      product.packageId = member.packageId;
    } else if (product.packageId !== null) {
      for (const other of this.store.products_.values()) {
        if (other.variantGroupId === group.id && other.id !== product.id) {
          other.packageId = product.packageId;
        }
      }
    }
  }

  // ---- customers --------------------------------------------------------

  private customerByUuid(uuid: string) {
    return [...this.store.customers_.values()].find((c) => c.uuid === uuid);
  }

  async createCustomer(
    input: CustomerWrite
  ): Promise<{ id: number; uuid: string }> {
    if (!input.email) throw new Error('Email is required');
    if (!input.full_name) throw new Error('Full name is required');
    const given = [
      input.password !== undefined,
      input.passwordHash !== undefined,
      input.noPassword === true
    ].filter(Boolean).length;
    if (given > 1) {
      throw new Error('Give either a password or a password hash, not both');
    }
    if (given === 0) throw new Error('Password is required');
    if (
      input.passwordHash !== undefined &&
      !BCRYPT_HASH.test(input.passwordHash)
    ) {
      throw new Error('The password hash is not a bcrypt hash');
    }
    if (input.password !== undefined) {
      const checked = (await this.store.passwordCheck())(input.password);
      if (!checked.ok) throw new Error(checked.message);
    }
    // The unique index of the table: exact, not ignoring letter case.
    if (
      [...this.store.customers_.values()].some((c) => c.email === input.email)
    ) {
      throw new Error('Email is already used');
    }
    const id = Math.max(0, ...[...this.store.customers_.keys()]) + 1;
    const uuid = `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`;
    this.store.customers_.set(id, {
      id,
      uuid,
      email: input.email,
      name: input.full_name,
      status: input.status ?? 1,
      groupId: input.group_id ?? 1,
      metaData: {}
    });
    this.customerPasswords.set(
      uuid,
      input.password !== undefined
        ? { kind: 'plain', value: input.password }
        : input.passwordHash !== undefined
        ? { kind: 'hash', value: input.passwordHash }
        : { kind: 'none', value: this.unusableHash }
    );
    return { id, uuid };
  }

  async updateCustomer(uuid: string, input: CustomerWrite): Promise<void> {
    const customer = this.customerByUuid(uuid);
    if (!customer) throw new Error('Requested customer not found');
    if (input.email !== undefined) customer.email = input.email;
    if (input.full_name !== undefined) customer.name = input.full_name;
    if (input.status !== undefined) customer.status = input.status;
    if (input.group_id !== undefined) customer.groupId = input.group_id;
    // The password is not changed here: core drops it on purpose.
  }

  async setCustomerMetafields(
    customerId: number,
    values: Record<string, Record<string, unknown>>
  ): Promise<void> {
    const customer = this.store.customers_.get(customerId);
    if (!customer) throw new Error('Requested customer not found');
    // As core's `validateMetafields`: every definition checks its value, a key
    // with no definition is dropped, and the result replaces the stored set.
    const kept: Record<string, Record<string, unknown>> = {};
    for (const definition of (
      await this.store.metafields('customer')
    ).values()) {
      const checked = definition.check(
        values?.[definition.namespace]?.[definition.key]
      );
      if (!checked.ok) throw new Error(checked.message);
      if (checked.value !== undefined) {
        (kept[definition.namespace] ??= {})[definition.key] = checked.value;
      }
    }
    customer.metaData = kept;
  }

  async recordRedirects(
    productUuid: string,
    fromPaths: string[]
  ): Promise<void> {
    const product = this.productByUuid(productUuid);
    if (!product) throw new Error('Requested product not found');
    const entityUrn = `urn:evershop:catalog:product:${productUuid}`;
    // The product's own path: its category's path (a root category has its key) and its key.
    const toPath = product.categoryUrlKey
      ? `/${product.categoryUrlKey}/${product.urlKey}`
      : `/${product.urlKey}`;
    for (const path of fromPaths) {
      if (path === toPath) continue;
      this.store.redirects_.set(path, { fromPath: path, entityUrn });
      this.redirectRows.set(path, {
        toPath,
        statusCode: 301,
        source: 'import',
        entityUrn
      });
    }
    this.redirects.set(productUuid, [
      ...(this.redirects.get(productUuid) ?? []),
      ...fromPaths
    ]);
  }
}
