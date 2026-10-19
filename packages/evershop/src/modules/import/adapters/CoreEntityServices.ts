import {
  commit,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { getConnection } from '../../../lib/postgres/connection.js';
import { CatalogUrn } from '../../../lib/urn/index.js';
import { createUnusablePasswordHash } from '../../../lib/util/passwordHelper.js';
import { recordRedirect } from '../../base/services/recordRedirect.js';
import createCategory from '../../catalog/services/category/createCategory.js';
import updateCategory from '../../catalog/services/category/updateCategory.js';
import createProduct from '../../catalog/services/product/createProduct.js';
import updateProduct from '../../catalog/services/product/updateProduct.js';
import { buildEntityPath } from '../../catalog/services/redirect/pathRemap.js';
import { resolveCategoryUrlPath } from '../../catalog/services/redirect/resolveCategoryUrlPath.js';
import addVariantItem from '../../catalog/services/variant/addVariantItem.js';
import createVariantGroup from '../../catalog/services/variant/createVariantGroup.js';
import createCustomer from '../../customer/services/customer/createCustomer.js';
import { setCustomerMetafields } from '../../customer/services/customer/customerMetafield.js';
import updateCustomer from '../../customer/services/customer/updateCustomer.js';
import type {
  CategoryWrite,
  CustomerWrite,
  EntityServices,
  ProductWrite
} from '../services/ports/services.js';

/**
 * The real `EntityServices` (§ 4.5, point 2): core's own category services, so
 * that an imported category goes through the same checks, hooks and triggers as
 * one made in the admin. Each call is one transaction that the service owns; an
 * error it throws (a validation message, or a PostgreSQL error with its
 * SQLSTATE in `code`) is a failed row, and the writer classifies it.
 *
 * The services take the registry and the hooks as the process has them. The
 * worker boots every module first (`headlessBoot`), so the processors that
 * extensions and core modules register are there.
 */
export function createCoreEntityServices(pool: Pool): EntityServices {
  const data = (input: CategoryWrite | ProductWrite) => ({ ...input });
  // The password nobody knows (D-27): one bcrypt hash (about 60 ms) for all the
  // accounts this object creates. The object lives as long as the worker, which
  // is one job.
  let unusablePasswordHash: string | undefined;
  return {
    async createCategory(input) {
      const row = await createCategory(data(input) as never, {});
      return { id: Number(row.category_id), uuid: String(row.uuid) };
    },

    async updateCategory(uuid, input) {
      // `createCategory` refuses a parent that is not there; `updateCategory`
      // does not, and would store a parent that does not exist (found 2026-10-18,
      // by the contract). The parent was checked with the file, but it can be
      // deleted before the row is written.
      if (input.parent_id !== undefined) {
        const parent = await pool.query(
          'SELECT 1 FROM category WHERE category_id = $1',
          [input.parent_id]
        );
        if (parent.rows.length === 0) {
          throw new Error('Parent category not found');
        }
      }
      await updateCategory(uuid, data(input) as never, {});
    },

    async createProduct(input) {
      const row = await createProduct(data(input) as never, {});
      return { id: Number(row.product_id), uuid: String(row.uuid) };
    },

    async updateProduct(uuid, input) {
      await updateProduct(uuid, data(input) as never, {});
    },

    async createVariantGroup({ attributeGroupId, axisCodes }) {
      const { group } = await createVariantGroup({
        attribute_group_id: attributeGroupId,
        attribute_codes: axisCodes
      });
      return { id: Number(group.variant_group_id), uuid: String(group.uuid) };
    },

    async addVariantItem(groupUuid, productUuid) {
      await addVariantItem(groupUuid, productUuid);
    },

    // G3: no welcome e-mail, a hash stored as given, or a password nobody knows.
    async createCustomer(input: CustomerWrite) {
      const { passwordHash, noPassword, ...fields } = input;
      const context: Record<string, unknown> = {
        suppressRegistrationEvent: true
      };
      if (passwordHash !== undefined) {
        context.passwordHash = passwordHash;
      }
      if (noPassword === true) {
        unusablePasswordHash ??= createUnusablePasswordHash();
        context.allowNoPassword = true;
        context.unusablePasswordHash = unusablePasswordHash;
      }
      const row = await createCustomer(fields as never, context);
      return { id: Number(row.customer_id), uuid: String(row.uuid) };
    },

    // Core drops the password on an update; it is not even sent.
    async updateCustomer(uuid: string, input: CustomerWrite) {
      const { password, passwordHash, noPassword, ...fields } = input;
      void [password, passwordHash, noPassword];
      await updateCustomer(uuid, fields as never, {});
    },

    async setCustomerMetafields(customerId, values) {
      await setCustomerMetafields(customerId, values);
    },

    // The old addresses go to the product's own path as 301 redirects (G4). The
    // path is built here, at write time: the product's `url_rewrite` row does
    // not exist yet, because the subscriber builds it after the commit. It is
    // the same path the product's url_rewrite will have (category path + key).
    async recordRedirects(productUuid, fromPaths) {
      if (fromPaths.length === 0) {
        return;
      }
      const connection = await getConnection();
      await startTransaction(connection);
      try {
        const query = select().from('product');
        query
          .leftJoin('product_description')
          .on(
            'product_description.product_description_product_id',
            '=',
            'product.product_id'
          );
        const product = (await query
          .where('uuid', '=', productUuid)
          .load(connection, false)) as {
          category_id: number | null;
          url_key: string;
        } | null;
        if (!product) {
          throw new Error('Requested product not found');
        }
        const toPath = buildEntityPath(
          await resolveCategoryUrlPath(connection, product.category_id),
          product.url_key
        );
        for (const fromPath of fromPaths) {
          await recordRedirect(connection, {
            fromPath,
            toPath,
            entityUrn: CatalogUrn.product(productUuid),
            statusCode: 301,
            source: 'import'
          });
        }
        await commit(connection);
      } catch (error) {
        await rollback(connection);
        throw error;
      }
    }
  };
}
