import relatedProductsRulesSchema from '../recommendation/relatedProductsRulesSchema.json' with { type: 'json' };
import baseCategoryDataSchema from './categoryDataSchema.json' with { type: 'json' };

/**
 * Category payload schema = the base JSON + the shared related-products rules
 * schema (specifications/05 § 6.2) composed statically at module load — same
 * mechanism and rationale as services/product/productDataSchema.ts (null =
 * inherit global, deep validation for objects, leaf error messages intact,
 * registry keys left purely for extensions, one shared mutable object for the
 * per-call `.required` mutations in create/updateCategory).
 */
export const categoryDataSchema = {
  ...baseCategoryDataSchema,
  properties: {
    ...baseCategoryDataSchema.properties,
    related_products_rules: {
      ...relatedProductsRulesSchema,
      type: ['object', 'null']
    }
  }
};
