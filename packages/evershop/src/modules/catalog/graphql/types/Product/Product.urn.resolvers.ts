import { CatalogUrn } from '@evershop/evershop/lib/urn';

export default {
  Product: {
    urn: (product: { uuid: string }) => CatalogUrn.product(product.uuid)
  }
};
