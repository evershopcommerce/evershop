import type { Pool } from 'pg';
import { ADDRESS_COLUMNS } from '../../../lib/address/tokens.js';
import type { MetafieldDefinition } from '../../../lib/metafield/types.js';
import { verifyPassword } from '../../../lib/util/passwordHelper.js';
import { getValue } from '../../../lib/util/registry.js';
import type {
  AttributeType,
  Lookup,
  AddressRules,
  NamedRecord,
  PasswordCheck,
  StoredAddress,
  StoredAttribute,
  StoredCategory,
  StoredCustomer,
  StoredMetafield,
  StoredProduct,
  StoredRedirect,
  StoredVariantGroup
} from '../services/ports/lookup.js';
import type { ImportEntity } from '../services/types.js';
import { createAddressRules } from './addressRules.js';
import { toStoredMetafield } from './metafieldCheck.js';

/**
 * What decides a reserved `url_key` and does not live in the database: the
 * routes of the storefront (they are scanned from `route.json` files into the
 * router's memory) and the enabled languages (a setting with a merge rule of its
 * own). The composition root gives core's `getRoutes()` and
 * `getEnabledLanguages()`, so the rule stays in core and is not copied here.
 */
export interface ReservedKeySources {
  /** The paths of the routes that are not admin and not API, e.g. `/cart`. */
  routePaths(): readonly string[];
  /** The enabled locale codes, e.g. `en`. */
  enabledLanguages(): Promise<readonly string[]>;
}

/**
 * The same test as `base/services/assertUrlKeyAvailable.ts`: a route of one
 * segment of letters, digits and hyphens. A `url_key` equal to one is
 * unreachable, because the route matcher wins over the `url_rewrite` fallback.
 */
const SINGLE_SEGMENT = /^\/[a-zA-Z0-9-]+$/;

/** The `owner_type` of the custom-field definitions of each entity. */
const OWNER_TYPE: Record<ImportEntity, string | null> = {
  category: 'category',
  product: 'product',
  customer: 'customer',
  // Addresses carry no custom fields.
  customerAddress: null
};

/**
 * The questions of the stages about the store (§ 4.5, point 2), read-only and in
 * batches. It takes the pool as an argument, so a test can point it at a scratch
 * database.
 */
export class PgLookup implements Lookup {
  constructor(
    private readonly pool: Pool,
    private readonly reserved: ReservedKeySources
  ) {}

  async categories(
    urlKeys: readonly string[]
  ): Promise<Map<string, StoredCategory>> {
    const found = new Map<string, StoredCategory>();
    if (urlKeys.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT c.category_id, c.uuid, c.status, c.meta_data, cd.url_key, cd.name,
              parent.url_key AS parent_url_key
         FROM category_description cd
         JOIN category c ON c.category_id = cd.category_description_category_id
         LEFT JOIN category_description parent
                ON parent.category_description_category_id = c.parent_id
        WHERE cd.url_key = ANY($1::text[])`,
      [urlKeys]
    );
    for (const row of result.rows) {
      found.set(row.url_key, {
        id: row.category_id,
        uuid: row.uuid,
        urlKey: row.url_key,
        parentUrlKey: row.parent_url_key,
        name: row.name,
        status: row.status ? 1 : 0,
        metaData: row.meta_data ?? {}
      });
    }
    return found;
  }

  async reservedUrlKeys(): Promise<ReadonlySet<string>> {
    const keys = new Set<string>();
    for (const path of this.reserved.routePaths()) {
      if (SINGLE_SEGMENT.test(path)) {
        keys.add(path.slice(1));
      }
    }
    for (const language of await this.reserved.enabledLanguages()) {
      keys.add(language);
    }
    return keys;
  }

  async metafieldKeys(entity: ImportEntity): Promise<ReadonlySet<string>> {
    const owner = OWNER_TYPE[entity];
    if (owner === null) {
      return new Set();
    }
    const result = await this.pool.query(
      `SELECT namespace, field_key FROM metafield_definition WHERE owner_type = $1`,
      [owner]
    );
    return new Set(
      result.rows.map((row) => `${row.namespace}.${row.field_key}`)
    );
  }

  async metafields(
    entity: ImportEntity
  ): Promise<ReadonlyMap<string, StoredMetafield>> {
    const found = new Map<string, StoredMetafield>();
    const owner = OWNER_TYPE[entity];
    if (owner === null) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT * FROM metafield_definition WHERE owner_type = $1
        ORDER BY position, metafield_definition_id`,
      [owner]
    );
    for (const row of result.rows) {
      const definition: MetafieldDefinition = {
        uuid: row.uuid,
        ownerType: row.owner_type,
        namespace: row.namespace,
        key: row.field_key,
        name: row.name,
        type: row.field_type,
        isList: row.is_list,
        required: row.required,
        validations: row.validations ?? [],
        appearance: row.appearance ?? {},
        subFields: row.sub_fields ?? [],
        visibleToCustomer: Boolean(row.visible_to_customer),
        position: row.position
      };
      found.set(
        `${definition.namespace}.${definition.key}`,
        toStoredMetafield(definition)
      );
    }
    return found;
  }

  async customers(
    emails: readonly string[]
  ): Promise<Map<string, StoredCustomer[]>> {
    const found = new Map<string, StoredCustomer[]>();
    if (emails.length === 0) {
      return found;
    }
    // The unique index of the table is case-sensitive, so two customers can
    // differ only in the case of the e-mail: every one is given.
    const result = await this.pool.query(
      `SELECT customer_id, uuid, email, full_name, status, group_id, meta_data
         FROM customer
        WHERE lower(email) = ANY($1::text[])
        ORDER BY customer_id`,
      [emails.map((email) => email.toLowerCase())]
    );
    for (const row of result.rows) {
      const key = String(row.email).toLowerCase();
      const list = found.get(key) ?? [];
      list.push({
        id: row.customer_id,
        uuid: row.uuid,
        email: row.email,
        name: row.full_name ?? '',
        status: row.status === 1 ? 1 : 0,
        groupId: row.group_id,
        metaData: row.meta_data ?? {}
      });
      found.set(key, list);
    }
    return found;
  }

  async customerGroups(
    names: readonly string[]
  ): Promise<Map<string, NamedRecord[]>> {
    const found = new Map<string, NamedRecord[]>();
    if (names.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT customer_group_id, group_name FROM customer_group
        WHERE lower(group_name) = ANY($1::text[])
        ORDER BY customer_group_id`,
      [names.map((name) => name.trim().toLowerCase())]
    );
    for (const row of result.rows) {
      const key = String(row.group_name).trim().toLowerCase();
      const list = found.get(key) ?? [];
      list.push({ id: row.customer_group_id, name: row.group_name });
      found.set(key, list);
    }
    return found;
  }

  // The seam is the processors of `customerAddressDataBeforeCreate`, which the
  // customer module registers and extensions may add to; the rest is core's library.
  async addressRules(): Promise<AddressRules> {
    return createAddressRules({
      normalize: (address) =>
        getValue('customerAddressDataBeforeCreate', address, {})
    });
  }

  async customerAddresses(
    customerIds: readonly number[]
  ): Promise<Map<number, StoredAddress[]>> {
    const found = new Map<number, StoredAddress[]>();
    if (customerIds.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT * FROM customer_address WHERE customer_id = ANY($1::int[])
        ORDER BY customer_address_id`,
      [customerIds]
    );
    for (const row of result.rows) {
      const fields: Record<string, string> = {};
      for (const column of ADDRESS_COLUMNS) {
        const value = row[column];
        fields[column] =
          value === null || value === undefined ? '' : String(value);
      }
      const list = found.get(row.customer_id) ?? [];
      list.push({
        id: row.customer_address_id,
        fields,
        extra: row.extra ?? null
      });
      found.set(row.customer_id, list);
    }
    return found;
  }

  // Core's own rules: the length and whatever an extension added.
  async passwordCheck(): Promise<PasswordCheck> {
    return (password) => {
      try {
        verifyPassword(password);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: (error as Error).message };
      }
    };
  }

  async products(skus: readonly string[]): Promise<Map<string, StoredProduct>> {
    const found = new Map<string, StoredProduct>();
    if (skus.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT p.product_id, p.uuid, p.sku, pd.url_key, p.status, p.group_id,
              p.package_id, p.no_shipping_required, p.variant_group_id,
              p.meta_data, cd.url_key AS category_url_key,
              ARRAY(SELECT DISTINCT a.attribute_code
                      FROM product_attribute_value_index v
                      JOIN attribute a ON a.attribute_id = v.attribute_id
                     WHERE v.product_id = p.product_id) AS attribute_codes
         FROM product p
         JOIN product_description pd
           ON pd.product_description_product_id = p.product_id
         LEFT JOIN category_description cd
           ON cd.category_description_category_id = p.category_id
        WHERE p.sku = ANY($1::text[])`,
      [skus]
    );
    for (const row of result.rows) {
      found.set(row.sku, {
        id: row.product_id,
        uuid: row.uuid,
        sku: row.sku,
        urlKey: row.url_key,
        status: row.status ? 1 : 0,
        attributeGroupId: row.group_id,
        packageId: row.package_id,
        noShippingRequired: Boolean(row.no_shipping_required),
        categoryUrlKey: row.category_url_key ?? null,
        variantGroupId: row.variant_group_id,
        attributeCodes: row.attribute_codes ?? [],
        metaData: row.meta_data ?? {}
      });
    }
    return found;
  }

  async productUrlKeyOwners(
    urlKeys: readonly string[]
  ): Promise<Map<string, string>> {
    const owners = new Map<string, string>();
    if (urlKeys.length === 0) {
      return owners;
    }
    const result = await this.pool.query(
      `SELECT pd.url_key, p.sku
         FROM product_description pd
         JOIN product p ON p.product_id = pd.product_description_product_id
        WHERE pd.url_key = ANY($1::text[])`,
      [urlKeys]
    );
    for (const row of result.rows) {
      owners.set(row.url_key, row.sku);
    }
    return owners;
  }

  attributeGroups(names: readonly string[]) {
    return this.named(
      'attribute_group',
      'attribute_group_id',
      'group_name',
      names
    );
  }

  packages(names: readonly string[]) {
    return this.named('package', 'package_id', 'name', names);
  }

  taxClasses(names: readonly string[]) {
    return this.named('tax_class', 'tax_class_id', 'name', names);
  }

  // The three tables are named records matched by name, ignoring letter case and
  // surrounding spaces (§ 5.1). The table and the columns are constants of this
  // class, never input.
  private async named(
    table: string,
    idColumn: string,
    nameColumn: string,
    names: readonly string[]
  ): Promise<Map<string, NamedRecord[]>> {
    const found = new Map<string, NamedRecord[]>();
    const wanted = [...new Set(names.map((name) => name.trim().toLowerCase()))];
    if (wanted.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT ${idColumn} AS id, ${nameColumn} AS name,
              lower(btrim(${nameColumn})) AS key
         FROM ${table}
        WHERE lower(btrim(${nameColumn})) = ANY($1::text[])
        ORDER BY ${idColumn}`,
      [wanted]
    );
    for (const row of result.rows) {
      const records = found.get(row.key) ?? [];
      records.push({ id: row.id, name: row.name });
      found.set(row.key, records);
    }
    return found;
  }

  async defaultPackage(): Promise<NamedRecord | null> {
    const result = await this.pool.query(
      `SELECT package_id AS id, name FROM package WHERE is_default LIMIT 1`
    );
    return result.rows[0]
      ? { id: result.rows[0].id, name: result.rows[0].name }
      : null;
  }

  async attributeCodes(): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT attribute_code FROM attribute ORDER BY attribute_id'
    );
    return result.rows.map((row) => String(row.attribute_code));
  }

  async attributes(
    codes: readonly string[]
  ): Promise<Map<string, StoredAttribute>> {
    const found = new Map<string, StoredAttribute>();
    const wanted = [...new Set(codes.map((code) => code.trim().toLowerCase()))];
    if (wanted.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT attribute_id, attribute_code, type, is_required
         FROM attribute
        WHERE lower(attribute_code) = ANY($1::text[])
        ORDER BY attribute_id`,
      [wanted]
    );
    for (const row of result.rows) {
      found.set(row.attribute_code.toLowerCase(), toAttribute(row));
    }
    return found;
  }

  async attributeGroupLinks(groupId: number): Promise<{
    linked: ReadonlySet<number>;
    required: StoredAttribute[];
  }> {
    const result = await this.pool.query(
      `SELECT a.attribute_id, a.attribute_code, a.type, a.is_required
         FROM attribute_group_link l
         JOIN attribute a ON a.attribute_id = l.attribute_id
        WHERE l.group_id = $1
        ORDER BY a.attribute_id`,
      [groupId]
    );
    return {
      linked: new Set(result.rows.map((row) => row.attribute_id as number)),
      required: result.rows.filter((row) => row.is_required).map(toAttribute)
    };
  }

  async attributeOptions(
    attributeId: number,
    texts: readonly string[]
  ): Promise<Map<string, number[]>> {
    const found = new Map<string, number[]>();
    const wanted = [...new Set(texts.map((text) => text.trim().toLowerCase()))];
    if (wanted.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT attribute_option_id, lower(btrim(option_text)) AS key
         FROM attribute_option
        WHERE attribute_id = $1 AND lower(btrim(option_text)) = ANY($2::text[])
        ORDER BY attribute_option_id`,
      [attributeId, wanted]
    );
    for (const row of result.rows) {
      const ids = found.get(row.key) ?? [];
      ids.push(row.attribute_option_id);
      found.set(row.key, ids);
    }
    return found;
  }

  async variantGroups(
    ids: readonly number[]
  ): Promise<Map<number, StoredVariantGroup>> {
    const found = new Map<number, StoredVariantGroup>();
    if (ids.length === 0) {
      return found;
    }
    const groups = await this.pool.query(
      `SELECT variant_group_id, uuid, attribute_group_id,
              attribute_one, attribute_two, attribute_three,
              attribute_four, attribute_five
         FROM variant_group
        WHERE variant_group_id = ANY($1::int[])`,
      [ids]
    );
    const axisIds = new Set<number>();
    for (const row of groups.rows) {
      for (const axis of AXIS_COLUMNS) {
        if (row[axis] !== null) axisIds.add(row[axis]);
      }
    }
    const codeOf = new Map<number, string>();
    if (axisIds.size > 0) {
      const codes = await this.pool.query(
        `SELECT attribute_id, attribute_code FROM attribute
          WHERE attribute_id = ANY($1::int[])`,
        [[...axisIds]]
      );
      for (const row of codes.rows) {
        codeOf.set(row.attribute_id, row.attribute_code);
      }
    }
    for (const row of groups.rows) {
      found.set(row.variant_group_id, {
        id: row.variant_group_id,
        uuid: row.uuid,
        attributeGroupId: row.attribute_group_id,
        axisCodes: AXIS_COLUMNS.filter((axis) => row[axis] !== null).map(
          (axis) => codeOf.get(row[axis]) as string
        ),
        members: []
      });
    }
    if (axisIds.size > 0) {
      const members = await this.pool.query(
        `SELECT p.variant_group_id, p.sku, p.package_id,
                v.attribute_id, v.option_id
           FROM product p
           LEFT JOIN product_attribute_value_index v
             ON v.product_id = p.product_id AND v.attribute_id = ANY($2::int[])
          WHERE p.variant_group_id = ANY($1::int[])
          ORDER BY p.product_id`,
        [ids, [...axisIds]]
      );
      for (const row of members.rows) {
        const group = found.get(row.variant_group_id);
        if (!group) continue;
        let member = group.members.find((m) => m.sku === row.sku);
        if (!member) {
          member = {
            sku: row.sku,
            packageId: row.package_id,
            options: Object.fromEntries(group.axisCodes.map((c) => [c, null]))
          };
          group.members.push(member);
        }
        if (row.attribute_id !== null) {
          const code = codeOf.get(row.attribute_id);
          if (code !== undefined && code in member.options) {
            member.options[code] = row.option_id;
          }
        }
      }
    }
    return found;
  }

  async redirects(
    paths: readonly string[]
  ): Promise<Map<string, StoredRedirect>> {
    const found = new Map<string, StoredRedirect>();
    if (paths.length === 0) {
      return found;
    }
    const result = await this.pool.query(
      `SELECT from_path, entity_urn FROM url_redirect
        WHERE from_path = ANY($1::text[])`,
      [paths]
    );
    for (const row of result.rows) {
      found.set(row.from_path, {
        fromPath: row.from_path,
        entityUrn: row.entity_urn
      });
    }
    return found;
  }

  async rewritePaths(paths: readonly string[]): Promise<ReadonlySet<string>> {
    if (paths.length === 0) {
      return new Set();
    }
    const result = await this.pool.query(
      `SELECT request_path FROM url_rewrite
        WHERE request_path = ANY($1::text[])`,
      [paths]
    );
    return new Set(result.rows.map((row) => row.request_path as string));
  }
}

const AXIS_COLUMNS = [
  'attribute_one',
  'attribute_two',
  'attribute_three',
  'attribute_four',
  'attribute_five'
] as const;

function toAttribute(row: {
  attribute_id: number;
  attribute_code: string;
  type: string;
  is_required: boolean;
}): StoredAttribute {
  return {
    id: row.attribute_id,
    code: row.attribute_code,
    type: row.type as AttributeType,
    required: Boolean(row.is_required)
  };
}
