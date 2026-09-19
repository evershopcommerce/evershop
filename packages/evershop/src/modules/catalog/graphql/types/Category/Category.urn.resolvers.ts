import { CatalogUrn } from '@evershop/evershop/lib/urn';

export default {
  Category: {
    urn: (category: { uuid: string }) => CatalogUrn.category(category.uuid)
  }
};
