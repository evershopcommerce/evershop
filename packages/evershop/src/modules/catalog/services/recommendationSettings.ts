import { toBoolean, toFloat, toInt } from '../../../lib/util/coerce.js';
import { isPlainObject } from '../../../lib/util/isPlainObject.js';
import { getSettingSync } from '../../setting/services/setting.js';

/**
 * Recommendation settings (related products + frequently bought together).
 * Spec: specifications/05-related-products-cross-sell-specification.md § 12.
 *
 * Same DB → default shape as `catalogSettings.ts` (no legacy config fallback —
 * these keys never existed in config). All getters are SYNCHRONOUS
 * (cache-only) so they are safe inside resolvers on the hot PDP path. Values
 * are coerced because the `setting` table returns scalars as strings.
 *
 * The FBT gates (§ 7.4) deliberately default LOW — pair >= 3, anchor >= 5,
 * lift > 1 — calibrated for small stores; a large per-anchor threshold would
 * starve most PDPs of data (§ 1.1 D3).
 */

export interface RelatedProductsRule {
  type: 'same_category' | 'same_collection' | 'same_attribute_values';
  enabled: boolean;
  /** Required when type = 'same_attribute_values'. */
  attributeCodes?: string[];
  /** Required when type = 'same_attribute_values'. */
  scope?: 'same_category' | 'same_collection';
}

export interface RelatedProductsRulesConfig {
  enabled: boolean;
  /** Ordered — array order IS waterfall priority (§ 6.2). */
  rules: RelatedProductsRule[];
  priceBand?: { enabled: boolean; percent?: number };
  fallbackToBestsellers?: boolean;
}

/**
 * Zero-config default (§ 16): same-category rule on, bestseller fallback on —
 * WooCommerce-parity behavior with no admin action.
 */
export const DEFAULT_RELATED_PRODUCTS_RULES: RelatedProductsRulesConfig = {
  enabled: true,
  rules: [{ type: 'same_category', enabled: true }],
  priceBand: { enabled: false, percent: 30 },
  fallbackToBestsellers: true
};

/**
 * Minimal structural check used when reading a stored config (setting table,
 * category or product JSONB column). Full validation happens at WRITE time
 * against `recommendation/relatedProductsRulesSchema.json`; this read-side
 * guard only decides whether a stored value is usable at all — an unusable
 * value falls through to the next tier (§ 6.3), never throws on the PDP.
 */
export function isUsableRulesConfig(
  value: unknown
): value is RelatedProductsRulesConfig {
  return (
    isPlainObject(value) &&
    typeof (value as RelatedProductsRulesConfig).enabled === 'boolean' &&
    Array.isArray((value as RelatedProductsRulesConfig).rules)
  );
}

const RULE_TYPES: ReadonlyArray<RelatedProductsRule['type']> = [
  'same_category',
  'same_collection',
  'same_attribute_values'
];

/**
 * Drop malformed rule ITEMS from a shallow-usable config. The resolution
 * service already skips them per rule (rulePredicate), but the admin GraphQL
 * schema promises non-null item fields — a malformed item written out-of-band
 * must degrade to "dropped", never null the whole Product via the non-null
 * chain.
 */
export function sanitizeRulesConfig(
  config: RelatedProductsRulesConfig
): RelatedProductsRulesConfig {
  return {
    ...config,
    rules: config.rules.filter(
      (rule): rule is RelatedProductsRule =>
        isPlainObject(rule) &&
        typeof (rule as RelatedProductsRule).enabled === 'boolean' &&
        RULE_TYPES.includes((rule as RelatedProductsRule).type)
    )
  };
}

export function getGlobalRelatedProductsRules(): RelatedProductsRulesConfig {
  const stored = getSettingSync<unknown>('relatedProductsRules', undefined);
  return isUsableRulesConfig(stored)
    ? sanitizeRulesConfig(stored)
    : DEFAULT_RELATED_PRODUCTS_RULES;
}

export function getCrossSellMinPairCount(): number {
  return Math.max(
    1,
    toInt(getSettingSync<unknown>('crossSellMinPairCount', undefined), 3)
  );
}

export function getCrossSellMinAnchorOrders(): number {
  return Math.max(
    1,
    toInt(getSettingSync<unknown>('crossSellMinAnchorOrders', undefined), 5)
  );
}

export function getCrossSellMinLift(): number {
  return Math.max(
    0,
    toFloat(getSettingSync<unknown>('crossSellMinLift', undefined), 1)
  );
}

export function getCrossSellFallbackEnabled(): boolean {
  return toBoolean(getSettingSync<unknown>('crossSellFallbackEnabled', true));
}
