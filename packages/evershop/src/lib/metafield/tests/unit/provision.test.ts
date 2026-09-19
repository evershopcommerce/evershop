import {
  classifyIncumbent,
  refOf,
  sanitizeForManifest,
  stableStringify,
  validateManifestMetafieldDefinitions,
  type ManifestMetafieldDefinition
} from '../../provision.js';
import type { MetafieldDefinition } from '../../types.js';

function entry(
  over: Partial<ManifestMetafieldDefinition> = {}
): ManifestMetafieldDefinition {
  return {
    ownerType: 'product',
    namespace: 'editions',
    key: 'material',
    name: 'Material',
    type: 'short_text',
    ...over
  };
}

function incumbent(over: Partial<MetafieldDefinition> = {}): MetafieldDefinition {
  return {
    uuid: 'u-1',
    ownerType: 'product',
    namespace: 'editions',
    key: 'material',
    name: 'Material',
    type: 'short_text',
    isList: false,
    required: false,
    translatable: false,
    visibleToCustomer: true,
    validations: [],
    appearance: {},
    subFields: [],
    position: 0,
    ...over
  };
}

describe('validateManifestMetafieldDefinitions — schema', () => {
  test('a minimal valid entry passes with no errors', () => {
    const { errors } = validateManifestMetafieldDefinitions([entry()]);
    expect(errors).toEqual([]);
  });

  test('non-array input is an array-level error', () => {
    const { errors } = validateManifestMetafieldDefinitions({} as unknown);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(-1);
  });

  test('missing namespace is an error — themes must declare theirs explicitly', () => {
    const bad = { ...entry() } as Record<string, unknown>;
    delete bad.namespace;
    const { errors } = validateManifestMetafieldDefinitions([bad]);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('invalid key pattern and unknown type are schema errors', () => {
    const { errors } = validateManifestMetafieldDefinitions([
      entry({ key: 'Bad-Key' }),
      entry({ key: 'ok', type: 'money' as never })
    ]);
    expect(errors.some((e) => e.index === 0)).toBe(true);
    expect(errors.some((e) => e.index === 1)).toBe(true);
  });

  test('unknown top-level property is rejected (strict schema)', () => {
    const { errors } = validateManifestMetafieldDefinitions([
      { ...entry(), position: 5 } as unknown
    ]);
    expect(errors).toHaveLength(1);
  });

  test('group requires subFields; non-group must not carry them', () => {
    const { errors } = validateManifestMetafieldDefinitions([
      entry({ key: 'g', type: 'group' }),
      entry({
        key: 's',
        subFields: [{ key: 'a', name: 'A', type: 'short_text' }]
      })
    ]);
    expect(errors.some((e) => e.index === 0)).toBe(true);
    expect(errors.some((e) => e.index === 1)).toBe(true);
  });

  test('duplicate (owner, namespace, key) within the manifest is an error', () => {
    const { errors } = validateManifestMetafieldDefinitions([entry(), entry()]);
    expect(errors.some((e) => e.index === 1 && /duplicate/.test(e.message))).toBe(
      true
    );
  });

  test('group nesting beyond the lib depth cap is an error (compileField backstop)', () => {
    const deep = entry({
      key: 'g1',
      type: 'group',
      subFields: [
        {
          key: 'g2',
          name: 'G2',
          type: 'group',
          subFields: [
            {
              key: 'g3',
              name: 'G3',
              type: 'group',
              subFields: [{ key: 'leaf', name: 'Leaf', type: 'short_text' }]
            }
          ]
        }
      ]
    });
    const { errors } = validateManifestMetafieldDefinitions([deep]);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('validateManifestMetafieldDefinitions — lints', () => {
  test('required: true is a HARD error (would break every entity save)', () => {
    const { errors } = validateManifestMetafieldDefinitions([
      entry({ required: true })
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/required/);
  });

  test('translatable, unwired owner, custom namespace and unknown appearance keys warn', () => {
    const { errors, warnings } = validateManifestMetafieldDefinitions([
      entry({
        ownerType: 'brand', // no core wiring — blog_post/blog_category are wired since PR D
        namespace: 'custom',
        translatable: true,
        appearance: { placeholder: 'x', color: 'red' }
      })
    ]);
    expect(errors).toEqual([]);
    const messages = warnings.map((w) => w.message).join('\n');
    expect(messages).toMatch(/translatable/);
    expect(messages).toMatch(/no metafield wiring/);
    expect(messages).toMatch(/namespace "custom"/);
    expect(messages).toMatch(/unknown appearance key "color"/);
    expect(messages).not.toMatch(/unknown appearance key "placeholder"/);
  });

  test('appearance.placeholder alone produces no warnings', () => {
    const { warnings } = validateManifestMetafieldDefinitions([
      entry({ appearance: { placeholder: 'Organic cotton' } })
    ]);
    expect(warnings).toEqual([]);
  });
});

describe('classifyIncumbent', () => {
  test('identical when immutables and mutables match (defaults normalized)', () => {
    expect(classifyIncumbent(entry(), incumbent())).toEqual({
      kind: 'identical'
    });
  });

  test('type or isList mismatch is an immutable conflict', () => {
    const byType = classifyIncumbent(entry({ type: 'rich_text' }), incumbent());
    expect(byType.kind).toBe('immutable-conflict');
    const byList = classifyIncumbent(entry({ isList: true }), incumbent());
    expect(byList.kind).toBe('immutable-conflict');
  });

  test('name/validations differences are mutable drift with named fields', () => {
    const res = classifyIncumbent(
      entry({
        name: 'Fabric',
        validations: [{ type: 'size', max: 120 }]
      }),
      incumbent()
    );
    expect(res).toEqual({
      kind: 'mutable-drift',
      fields: ['name', 'validations']
    });
  });

  test('declared defaults match incumbent column defaults', () => {
    // visibleToCustomer omitted == true; isList omitted == false.
    const res = classifyIncumbent(
      entry(),
      incumbent({ visibleToCustomer: true, isList: false })
    );
    expect(res.kind).toBe('identical');
  });
});

describe('classifyIncumbent — jsonb canonicalization', () => {
  test('reordered object keys (as Postgres JSONB returns them) are NOT drift', () => {
    // Declared {type, max}; jsonb returns keys sorted (length, bytewise): {max, type}.
    const res = classifyIncumbent(
      entry({ validations: [{ type: 'size', max: 120 }] }),
      incumbent({
        validations: [{ max: 120, type: 'size' } as never]
      })
    );
    expect(res).toEqual({ kind: 'identical' });
  });

  test('merchant-set required on a provisioned definition surfaces as drift', () => {
    const res = classifyIncumbent(entry(), incumbent({ required: true }));
    expect(res).toEqual({ kind: 'mutable-drift', fields: ['required'] });
  });
});

describe('stableStringify', () => {
  test('key order does not matter; values and array order do', () => {
    expect(stableStringify({ a: 1, b: [{ x: 1, y: 2 }] })).toBe(
      stableStringify({ b: [{ y: 2, x: 1 }], a: 1 })
    );
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });
});

describe('sanitizeForManifest', () => {
  test('strips REST-mutated junk so export round-trips its own validation', () => {
    const dirty = incumbent({
      validations: [
        { type: 'size', max: 120, message: 'too long' } as never,
        { type: 'bogus' } as never
      ],
      appearance: { placeholder: 'x', color: 'red' }
    });
    const entry2 = sanitizeForManifest(dirty);
    expect(entry2).not.toBeNull();
    expect(entry2!.validations).toEqual([{ type: 'size', max: 120 }]);
    expect(entry2!.appearance).toEqual({ placeholder: 'x' });
    const { errors } = validateManifestMetafieldDefinitions([entry2]);
    expect(errors).toEqual([]);
  });

  test('returns null for definitions the manifest schema cannot express', () => {
    // A group whose subFields were all junk collapses to no subFields —
    // group-without-subFields fails the schema.
    const broken = incumbent({
      type: 'group',
      subFields: [{ noKey: true } as never]
    });
    expect(sanitizeForManifest(broken)).toBeNull();
  });

  test('a clean definition passes through unchanged in meaning', () => {
    const clean = sanitizeForManifest(incumbent());
    expect(clean).toEqual({
      ownerType: 'product',
      namespace: 'editions',
      key: 'material',
      name: 'Material',
      type: 'short_text'
    });
  });
});

describe('refOf', () => {
  test('refOf is owner.namespace.key', () => {
    expect(refOf(entry())).toBe('product.editions.material');
  });
});
