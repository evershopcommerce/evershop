import {
  commit,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import type { ProductRow, VariantGroupRow } from '../../../../types/db/index.js';
import { VariantGroupError } from './VariantGroupError.js';

export interface AddedVariantItem {
  /** The product as it was before it joined (its `variant_group_id` is still empty). */
  product: ProductRow;
  /** The product's values for the axes of the group: one row per axis it has a value for. */
  attributes: Array<{
    attribute_id: number;
    attribute_code: string;
    option_id: number;
  }>;
}

/**
 * Puts a product in a variant group, in one transaction.
 *
 * The product must exist and belong to the attribute group of the variant
 * group, else a `VariantGroupError` is thrown and nothing is written.
 *
 * A variant group ships in one box: all members have one `package_id` (see
 * wiki/package-management-design.md, Variants). It is made to agree when the
 * product joins. The joining product takes the package of a member that has
 * one; if no member has a package but the joining product has, its package
 * goes to the other members. Nothing changes when neither has one.
 *
 * The database trigger `update_attribute_index_and_variant_group_visibility`
 * runs at commit, because the join is an UPDATE of `product`: it deletes the
 * values of attributes that are not linked to the product's attribute group
 * and recomputes the visibility of the group.
 */
export default async function addVariantItem(
  groupUuid: string,
  productUuid: string
): Promise<AddedVariantItem> {
  const connection = await getConnection();
  try {
    await startTransaction(connection);
    const group = (await select()
      .from('variant_group')
      .where('uuid', '=', groupUuid)
      .load(connection, false)) as VariantGroupRow | null;
    if (!group) {
      throw new VariantGroupError('GROUP_NOT_FOUND', 'Invalid variant group');
    }

    const product = (await select()
      .from('product')
      .where('uuid', '=', productUuid)
      .and('group_id', '=', group.attribute_group_id)
      .load(connection, false)) as ProductRow | null;
    if (!product) {
      throw new VariantGroupError(
        'PRODUCT_NOT_ELIGIBLE',
        'The product is either not exist or using different attribute group'
      );
    }

    await update('product')
      .given({
        variant_group_id: group.variant_group_id
      })
      .where('uuid', '=', productUuid)
      .execute(connection, false);

    const groupMemberWithPackage = await select('package_id')
      .from('product')
      .where('variant_group_id', '=', group.variant_group_id)
      .and('product_id', '<>', product.product_id)
      .and('package_id', 'IS NOT NULL', null)
      .load(connection, false);
    if (groupMemberWithPackage) {
      await update('product')
        .given({ package_id: groupMemberWithPackage.package_id })
        .where('uuid', '=', productUuid)
        .execute(connection, false);
    } else if (product.package_id) {
      await update('product')
        .given({ package_id: product.package_id })
        .where('variant_group_id', '=', group.variant_group_id)
        .and('product_id', '<>', product.product_id)
        .execute(connection, false);
    }

    const variantAttributeIds = [
      group.attribute_one,
      group.attribute_two,
      group.attribute_three,
      group.attribute_four,
      group.attribute_five
    ].filter((a) => a !== null);

    const query = select().from('product_attribute_value_index');
    query
      .innerJoin('attribute')
      .on(
        'attribute.attribute_id',
        '=',
        'product_attribute_value_index.attribute_id'
      );
    query
      .where(
        'product_attribute_value_index.product_id',
        '=',
        product.product_id
      )
      .and(
        'product_attribute_value_index.attribute_id',
        'in',
        variantAttributeIds
      );
    const values = await query.execute(connection, false);

    await commit(connection);
    return {
      product,
      attributes: values.map((a) => ({
        attribute_id: a.attribute_id,
        attribute_code: a.attribute_code,
        option_id: a.option_id
      }))
    };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}
