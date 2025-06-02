import { select } from '@evershop/postgres-query-builder';
import type { SelectQuery } from '@evershop/postgres-query-builder';

export const getProductsBaseQuery = (): SelectQuery => {
  const query = select().from('product');
  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );
  query
    .innerJoin('product_inventory')
    .on(
      'product_inventory.product_inventory_product_id',
      '=',
      'product.product_id'
    );

  query
    .leftJoin('product_image')
    .on('product_image.product_image_product_id', '=', 'product.product_id')
    .and('product_image.is_main', '=', true);

  return query;
};
