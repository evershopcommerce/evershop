import { select } from '@evershop/postgres-query-builder';
import { error } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { merge } from '../../lib/util/merge.js';
import { addFinalProcessor, addProcessor } from '../../lib/util/registry.js';
import { getProductsBaseQuery } from '../catalog/services/getProductsBaseQuery.js';
import { registerCartBaseFields } from '../checkout/services/cart/registerCartBaseFields.js';
import { registerCartItemBaseFields } from './services/cart/registerCartItemBaseFields.js';
import { sortFields } from './services/cart/sortFields.js';
import { coreShippingProvider } from './services/shipping/core/coreProvider.js';
import { registerShippingProvider } from './services/shipping/registry.js';

export default () => {
  addProcessor('cartFields', registerCartBaseFields, 0);

  addProcessor('cartItemFields', registerCartItemBaseFields, 0);

  // Register Core as a first-class shipping provider. Other providers
  // (USPS, FedEx, EasyPost, …) register themselves from their own
  // module bootstrap files and become siblings of Core.
  registerShippingProvider(coreShippingProvider);

  addFinalProcessor('cartFields', (fields) => {
    try {
      const sortedFields = sortFields(fields);
      return sortedFields;
    } catch (e) {
      error(e);
      throw e;
    }
  });

  addFinalProcessor('cartItemFields', (fields) => {
    try {
      const sortedFields = sortFields(fields);
      return sortedFields;
    } catch (e) {
      error(e);
      throw e;
    }
  });

  addProcessor('cartItemProductLoaderFunction', () => async (id) => {
    const productQuery = getProductsBaseQuery();
    const product = await productQuery.where('product_id', '=', id).load(pool);
    // Merge the product's package (parcel size) onto the row so the cart-item
    // dimension fields and the `cartPackages` packing strategy can read it
    // without their own queries. NULL package_id (legacy/virtual products)
    // leaves the fields undefined — downstream degrades gracefully.
    if (product && product.package_id) {
      const pkg = await select()
        .from('package')
        .where('package_id', '=', product.package_id)
        .load(pool);
      if (pkg) {
        product.package_uuid = pkg.uuid;
        product.package_name = pkg.name;
        product.package_length = pkg.length;
        product.package_width = pkg.width;
        product.package_height = pkg.height;
        product.package_weight = pkg.weight; // tare
      }
    }
    return product;
  });

  addProcessor('configurationSchema', (schema) => {
    merge(schema, {
      properties: {
        checkout: {
          type: 'object',
          properties: {
            showShippingNote: {
              type: 'boolean'
            }
          }
        }
        // `shop.dimensionUnit` used to be declared here. It is an admin setting now
        // (read via getDimensionUnit in modules/setting/services); config.json keeps
        // working as an untyped legacy fallback, so no schema entry is needed.
      }
    });
    return schema;
  });
};
