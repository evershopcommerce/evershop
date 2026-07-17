import { Button } from '@components/common/ui/Button.js';
import { Switch } from '@components/common/ui/Switch.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Shared § 6.2 rules editor for the three admin surfaces (settings card,
 * product override, category override). The whole config lives in local
 * state and is written into the form as ONE headless registered path via
 * setValue — the form body then carries a real nested object with real
 * booleans/numbers (the § 5.3 AJV schemas are strict; a stringified copy or
 * string leaves would fail the save), and reordering never fights
 * react-hook-form over index-shifted field names.
 */

export interface RulesEditorRule {
  type: 'same_category' | 'same_collection' | 'same_attribute_values';
  enabled: boolean;
  attributeCodes?: string[];
  scope?: 'same_category' | 'same_collection';
}

export interface RulesEditorConfig {
  enabled: boolean;
  rules: RulesEditorRule[];
  priceBand?: { enabled: boolean; percent?: number };
  fallbackToBestsellers?: boolean;
}

const RULE_LABELS: Record<RulesEditorRule['type'], string> = {
  same_category: 'Same category',
  same_collection: 'Same collection',
  same_attribute_values: 'Same attribute values'
};

const ALL_RULE_TYPES = Object.keys(RULE_LABELS) as RulesEditorRule['type'][];

/** Every type exactly once, stored order first — array order IS priority. */
function normalizeConfig(initial?: RulesEditorConfig | null): RulesEditorConfig {
  const seen: RulesEditorRule[] = [];
  for (const rule of initial?.rules || []) {
    if (
      ALL_RULE_TYPES.includes(rule?.type) &&
      !seen.some((existing) => existing.type === rule.type)
    ) {
      seen.push({
        type: rule.type,
        enabled: rule.enabled === true,
        attributeCodes: Array.isArray(rule.attributeCodes)
          ? rule.attributeCodes.filter((code) => typeof code === 'string')
          : [],
        scope: rule.scope === 'same_collection' ? 'same_collection' : 'same_category'
      });
    }
  }
  for (const type of ALL_RULE_TYPES) {
    if (!seen.some((rule) => rule.type === type)) {
      seen.push({
        type,
        enabled: false,
        attributeCodes: [],
        scope: 'same_category'
      });
    }
  }
  return {
    enabled: initial?.enabled !== false,
    rules: seen,
    priceBand: {
      enabled: initial?.priceBand?.enabled === true,
      percent:
        typeof initial?.priceBand?.percent === 'number'
          ? initial.priceBand.percent
          : 30
    },
    fallbackToBestsellers: initial?.fallbackToBestsellers !== false
  };
}

/** Strip editor-only normalization before it hits the strict AJV schema. */
function toPayload(config: RulesEditorConfig): RulesEditorConfig {
  return {
    enabled: config.enabled,
    rules: config.rules.map((rule) =>
      rule.type === 'same_attribute_values'
        ? {
            type: rule.type,
            enabled: rule.enabled,
            attributeCodes: rule.attributeCodes || [],
            scope: rule.scope || 'same_category'
          }
        : { type: rule.type, enabled: rule.enabled }
    ),
    priceBand: {
      enabled: config.priceBand?.enabled === true,
      percent: config.priceBand?.percent ?? 30
    },
    fallbackToBestsellers: config.fallbackToBestsellers !== false
  };
}

/**
 * Controlled Switch — deliberately NOT the core ToggleField: every control in
 * this editor writes the config through ONE headless setValue path (see the
 * component doc above); a per-leaf RHF field would double-register state,
 * shift names on reorder, and post string leaves against the strict § 6.2
 * schema. Visual consistency comes from wrapping the same ui/Switch
 * primitive that ToggleField itself renders. The label text carries its own
 * onClick because base-ui switches ignore <label> association (the same
 * trap wiki/checkout-engine.md records for base-ui radios).
 */
function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2 text-sm select-none">
      <Switch
        checked={checked}
        onCheckedChange={(next) => onChange(Boolean(next))}
        size="sm"
        aria-label={label}
      />
      <span
        className="cursor-pointer"
        onClick={() => onChange(!checked)}
        role="presentation"
      >
        {label}
      </span>
    </span>
  );
}

export function RelatedRulesEditor({
  name,
  initial,
  attributes
}: {
  /** Form path the config object is written to (e.g. `relatedProductsRules`). */
  name: string;
  initial?: RulesEditorConfig | null;
  /** Select-type attributes available for the attribute-values rule. */
  attributes: Array<{ attributeCode: string; attributeName: string }>;
}) {
  const { register, setValue } = useFormContext();
  const [config, setConfig] = React.useState<RulesEditorConfig>(() =>
    normalizeConfig(initial)
  );

  React.useEffect(() => {
    register(name);
  }, [name]);
  // The mount-time seed write must not mark the field touched: the
  // unsaved-changes guard (ProductEditForm's Duplicate flow) intersects
  // dirty AND touched paths, and a touched seed would false-positive it on
  // every page load — while USER edits must set touched or the guard never
  // sees them and silently discards rule edits on Duplicate.
  const userEditRef = React.useRef(false);
  React.useEffect(() => {
    setValue(name, toPayload(config), {
      shouldDirty: true,
      shouldTouch: userEditRef.current
    });
    userEditRef.current = true;
  }, [name, config]);

  const update = (patch: Partial<RulesEditorConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));
  const updateRule = (index: number, patch: Partial<RulesEditorRule>) =>
    setConfig((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, ...patch } : rule
      )
    }));
  const moveRule = (index: number, direction: -1 | 1) =>
    setConfig((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.rules.length) {
        return prev;
      }
      const rules = [...prev.rules];
      [rules[index], rules[target]] = [rules[target], rules[index]];
      return { ...prev, rules };
    });

  return (
    <div className="space-y-4">
      <Toggle
        checked={config.enabled}
        onChange={(enabled) => update({ enabled })}
        label={_('Enable rule-based related products')}
      />
      {config.enabled && (
        <>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {_(
                'Rules fill remaining slots top-down (manual picks always come first). Reorder to change priority.'
              )}
            </div>
            {config.rules.map((rule, index) => (
              <div
                key={rule.type}
                className="rounded-md border border-divider bg-card px-3 py-2 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Toggle
                    checked={rule.enabled}
                    onChange={(enabled) => updateRule(index, { enabled })}
                    label={_(RULE_LABELS[rule.type])}
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.preventDefault();
                        moveRule(index, -1);
                      }}
                      aria-label={_('Move rule up')}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={index === config.rules.length - 1}
                      onClick={(e) => {
                        e.preventDefault();
                        moveRule(index, 1);
                      }}
                      aria-label={_('Move rule down')}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {rule.type === 'same_attribute_values' && rule.enabled && (
                  <div className="space-y-2 border-t border-divider pt-2">
                    <div className="text-xs font-medium">
                      {_('Match these attributes')}
                    </div>
                    {attributes.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        {_('No select-type attributes exist yet.')}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {attributes.map((attribute) => (
                        <Toggle
                          key={attribute.attributeCode}
                          checked={(rule.attributeCodes || []).includes(
                            attribute.attributeCode
                          )}
                          onChange={(checked) =>
                            updateRule(index, {
                              attributeCodes: checked
                                ? [
                                    ...(rule.attributeCodes || []),
                                    attribute.attributeCode
                                  ]
                                : (rule.attributeCodes || []).filter(
                                    (code) => code !== attribute.attributeCode
                                  )
                            })
                          }
                          label={attribute.attributeName}
                        />
                      ))}
                    </div>
                    <div className="text-xs font-medium pt-1">
                      {_('Within scope')}
                    </div>
                    <div className="flex gap-4">
                      {(['same_category', 'same_collection'] as const).map(
                        (scope) => (
                          <label
                            key={scope}
                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                          >
                            <input
                              type="radio"
                              checked={rule.scope === scope}
                              onChange={() => updateRule(index, { scope })}
                              className="accent-primary"
                            />
                            {scope === 'same_category'
                              ? _('Same category')
                              : _('Same collection')}
                          </label>
                        )
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {_(
                        'Attribute matching always combines with a scope — "same color" across the whole catalog would relate unrelated products.'
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-md border border-divider bg-card px-3 py-2 space-y-2">
            <Toggle
              checked={config.priceBand?.enabled === true}
              onChange={(enabled) =>
                update({
                  priceBand: { ...config.priceBand, enabled }
                })
              }
              label={_('Only show products in a similar price range')}
            />
            {config.priceBand?.enabled && (
              <label className="flex items-center gap-2 text-sm">
                {_('Within ±')}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.priceBand?.percent ?? 30}
                  onChange={(e) => {
                    const percent = parseInt(e.target.value, 10);
                    update({
                      priceBand: {
                        enabled: true,
                        percent: Number.isFinite(percent)
                          ? Math.min(100, Math.max(1, percent))
                          : 30
                      }
                    });
                  }}
                  className="w-20 rounded-md border border-divider bg-card px-2 py-1"
                />
                {_('% of the product price')}
              </label>
            )}
          </div>
          <Toggle
            checked={config.fallbackToBestsellers !== false}
            onChange={(fallbackToBestsellers) => update({ fallbackToBestsellers })}
            label={_('Fill remaining slots with bestsellers')}
          />
        </>
      )}
    </div>
  );
}
