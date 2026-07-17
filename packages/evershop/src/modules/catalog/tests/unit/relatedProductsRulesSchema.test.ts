import { describe, it, expect } from '@jest/globals';
import { getAjv } from '../../../base/services/getAjv.js';
import { categoryDataSchema } from '../../services/category/categoryDataSchema.js';
import { productDataSchema } from '../../services/product/productDataSchema.js';
import relatedProductsRulesSchema from '../../services/recommendation/relatedProductsRulesSchema.json' with { type: 'json' };
import type { RelatedProductsRulesConfig } from '../../services/recommendationSettings.js';

/**
 * Write-side validation of the recommendation config (spec § 5.3, § 6.2).
 * The composed schemas under test are the exact objects production compiles
 * (services/product/productDataSchema.ts, services/category/categoryDataSchema.ts);
 * only the update path's top-level `required = []` reset is replicated, on
 * deep clones so the shared singletons stay pristine across tests.
 */

function compileUpdateSchema(baseSchema: object) {
  const schema = structuredClone(baseSchema) as Record<string, unknown>;
  schema.required = [];
  return getAjv().compile(schema);
}

const validRules: RelatedProductsRulesConfig = {
  enabled: true,
  rules: [
    { type: 'same_category', enabled: true },
    {
      type: 'same_attribute_values',
      enabled: false,
      attributeCodes: ['color'],
      scope: 'same_category'
    }
  ],
  priceBand: { enabled: false, percent: 30 },
  fallbackToBestsellers: true
};

describe('relatedProductsRulesSchema (the single § 6.2 source)', () => {
  const validate = getAjv().compile(relatedProductsRulesSchema);

  it('accepts the spec § 6.2 example shape', () => {
    expect(validate(structuredClone(validRules))).toBe(true);
  });

  it('rejects string booleans — editors must emit typed values (§ 5.3)', () => {
    const bad = structuredClone(validRules) as unknown as Record<string, unknown>;
    bad.enabled = 'true';
    expect(validate(bad)).toBe(false);
  });

  it('requires attributeCodes and scope only when the attribute rule is ENABLED', () => {
    // Enabled without a scope / with empty codes → rejected.
    const bad = structuredClone(validRules);
    bad.rules[1].enabled = true;
    delete bad.rules[1].scope;
    expect(validate(bad)).toBe(false);
    const bad2 = structuredClone(validRules);
    bad2.rules[1].enabled = true;
    bad2.rules[1].attributeCodes = [];
    expect(validate(bad2)).toBe(false);
  });

  it('accepts the pristine default the editor emits — DISABLED attribute rule, no codes picked', () => {
    // RelatedRulesEditor always posts all three rule rows; on a fresh store
    // the attribute rule is disabled with attributeCodes: []. Requiring
    // codes there made the whole catalog settings form unsaveable
    // (found by e2e 2026-07-16).
    const pristine = structuredClone(validRules);
    pristine.rules[1] = {
      type: 'same_attribute_values',
      enabled: false,
      attributeCodes: [],
      scope: 'same_category'
    };
    expect(validate(pristine)).toBe(true);
    // A disabled row missing the keys entirely is fine too.
    const sparse = structuredClone(validRules);
    sparse.rules[1] = { type: 'same_attribute_values', enabled: false };
    expect(validate(sparse)).toBe(true);
  });

  it('rejects unknown rule types and unknown scopes', () => {
    const bad = structuredClone(validRules) as { rules: { type: string }[] };
    bad.rules[0].type = 'same_attribute_group';
    expect(validate(bad)).toBe(false);
    const bad2 = structuredClone(validRules) as { rules: { scope?: string }[] };
    bad2.rules[1].scope = 'category';
    expect(validate(bad2)).toBe(false);
  });

  it('bounds the price band percent to 1..100', () => {
    const cases: Array<[number, boolean]> = [
      [0, false],
      [1, true],
      [100, true],
      [101, false]
    ];
    for (const [percent, ok] of cases) {
      const cfg = structuredClone(validRules);
      cfg.priceBand = { enabled: true, percent };
      expect(validate(cfg)).toBe(ok);
    }
  });

  it('tolerates additive unknown keys (v2 forward-compat, § 19)', () => {
    const cfg = structuredClone(validRules) as unknown as Record<string, unknown>;
    cfg.futureKey = { anything: 1 };
    (cfg.rules as Record<string, unknown>[])[0].futureRuleKey = 'x';
    expect(validate(cfg)).toBe(true);
  });
});

describe('composed productDataSchema recommendation properties (update path)', () => {
  it('still accepts a plain product PATCH without any new field (regression)', () => {
    const validate = compileUpdateSchema(productDataSchema);
    expect(validate({ name: 'Shirt', sku: 'S-1', price: '10.00' })).toBe(true);
  });

  it('accepts each mode enum and rejects unknown modes', () => {
    const validate = compileUpdateSchema(productDataSchema);
    for (const mode of ['inherit', 'custom', 'manual_only']) {
      expect(validate({ related_products_mode: mode })).toBe(true);
    }
    expect(validate({ related_products_mode: 'global' })).toBe(false);
    for (const mode of ['auto', 'manual_only', 'manual_first']) {
      expect(validate({ cross_sell_mode: mode })).toBe(true);
    }
    expect(validate({ cross_sell_mode: 'manual' })).toBe(false);
  });

  it('exclude_from_recommendation uses the manage_stock union pattern', () => {
    const validate = compileUpdateSchema(productDataSchema);
    for (const ok of [0, 1, '0', '1', true, false]) {
      expect(validate({ exclude_from_recommendation: ok })).toBe(true);
    }
    expect(validate({ exclude_from_recommendation: 'yes' })).toBe(false);
  });

  it('mode "custom" without rules in the payload stays valid — partial PATCH semantics; § 6.3 degrades custom+NULL to inherit at read time', () => {
    const validate = compileUpdateSchema(productDataSchema);
    expect(validate({ related_products_mode: 'custom' })).toBe(true);
    expect(validate({ related_products_mode: 'custom', price: 20 })).toBe(true);
  });

  it('deep-validates rules objects and accepts null (revert-to-inherit, § 6.4)', () => {
    const validate = compileUpdateSchema(productDataSchema);
    expect(validate({ related_products_rules: null })).toBe(true);
    expect(
      validate({ related_products_rules: structuredClone(validRules) })
    ).toBe(true);
    const bad = structuredClone(validRules) as {
      rules: { enabled: unknown }[];
    };
    bad.rules[0].enabled = 'true';
    expect(validate({ related_products_rules: bad })).toBe(false);
  });

  it('surfaces the leaf error message, not a masking wrapper message', () => {
    const validate = compileUpdateSchema(productDataSchema);
    const bad = structuredClone(validRules) as {
      rules: { enabled: unknown }[];
    };
    bad.rules[0].enabled = 'true';
    validate({ related_products_rules: bad });
    const messages = (validate.errors || []).map((e) => e.message);
    expect(messages).toContain("Rule 'enabled' must be a boolean");
  });
});

describe('composed categoryDataSchema related_products_rules (update path)', () => {
  it('accepts null and a valid object; rejects a bad deep shape; plain PATCH unaffected', () => {
    const validate = compileUpdateSchema(categoryDataSchema);
    expect(validate({ related_products_rules: null })).toBe(true);
    expect(
      validate({ related_products_rules: structuredClone(validRules) })
    ).toBe(true);
    expect(validate({ related_products_rules: { enabled: true } })).toBe(false);
    expect(validate({ name: 'Shoes', status: 1 })).toBe(true);
  });
});
