import relatedProductsRulesSchema from '../recommendation/relatedProductsRulesSchema.json' with { type: 'json' };
import baseProductDataSchema from './productDataSchema.json' with { type: 'json' };

/**
 * Product payload schema = the base JSON + the shared related-products rules
 * schema (specifications/05 § 6.2) composed statically at module load. The
 * registry keys (create/updateProductDataJsonSchema) stay purely extension
 * points — core never patches its own schema through them.
 *
 * `type: ['object', 'null']` on the rules sub-schema (instead of an anyOf
 * wrapper): null must stay valid — reverting to inherited rules ships
 * `related_products_rules: null` (§ 6.4) — and JSON Schema ignores
 * `properties`/`required` for non-object instances, so null passes while
 * objects get the deep validation. An anyOf wrapper with its own
 * `errorMessage` string would mask every leaf message under ajv-errors.
 *
 * create/updateProduct mutate `.required` on this object per call — the
 * composition must therefore export one shared mutable object, matching the
 * previous raw-JSON-singleton behavior, while the raw JSON import itself
 * stays pristine for other consumers.
 */
export const productDataSchema = {
  ...baseProductDataSchema,
  properties: {
    ...baseProductDataSchema.properties,
    related_products_rules: {
      ...relatedProductsRulesSchema,
      type: ['object', 'null']
    }
  }
};
