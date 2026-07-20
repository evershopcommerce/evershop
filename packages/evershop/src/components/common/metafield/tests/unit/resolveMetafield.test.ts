import {
  resolveMetafield,
  type ProjectedDescriptorLike,
  type ShapedMetafieldEntry
} from '../../resolveMetafield.js';

const REF = 'product.editions.material';

function descriptor(
  over: Partial<ProjectedDescriptorLike> = {}
): ProjectedDescriptorLike {
  return {
    type: 'short_text',
    visibleToCustomer: true,
    name: 'Material',
    placeholder: 'Organic cotton',
    ...over
  };
}

function entry(over: Partial<ShapedMetafieldEntry> = {}): ShapedMetafieldEntry {
  return {
    namespace: 'editions',
    key: 'material',
    type: 'SHORT_TEXT', // GraphQL returns the enum NAME, uppercase
    value: 'Linen',
    ...over
  };
}

describe('resolveMetafield — the render matrix', () => {
  test('declared private renders NOTHING — never the default', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor({ visibleToCustomer: false }),
      entry: undefined, // hidden fields are absent from customer GraphQL
      defaultValue: 'leaks?'
    });
    expect(res).toEqual({ kind: 'hidden' });
  });

  test('stored value with matching type renders the value (enum name normalized)', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor(),
      entry: entry()
    });
    expect(res.kind).toBe('value');
    expect((res as any).value).toBe('Linen');
    expect((res as any).meta.isDefault).toBe(false);
  });

  test('unset value (null) falls back to defaultValue over placeholder', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor(),
      entry: entry({ value: null }),
      defaultValue: 'Override'
    });
    expect(res).toMatchObject({ kind: 'default', value: 'Override' });
    expect((res as any).meta.isDefault).toBe(true);
  });

  test('unset value without a prop override uses the manifest placeholder', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor(),
      entry: entry({ value: null })
    });
    expect(res).toMatchObject({ kind: 'default', value: 'Organic cotton' });
  });

  test('type mismatch (conflict-skipped incumbent) renders the default + warns', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor(),
      entry: entry({ type: 'RICH_TEXT', value: [{ id: 'r', columns: [] }] })
    });
    expect(res.kind).toBe('default');
    expect((res as any).value).toBe('Organic cotton');
    expect((res as any).warn).toMatch(/does not match the declared/);
  });

  test('declared but absent from entity data warns and renders the default', () => {
    const res = resolveMetafield({ ref: REF, descriptor: descriptor() });
    expect(res).toMatchObject({ kind: 'default', value: 'Organic cotton' });
    expect((res as any).warn).toMatch(/not provisioned yet|does not select/);
  });

  test('nothing to render at all is empty', () => {
    const res = resolveMetafield({ ref: REF });
    expect(res).toEqual({ kind: 'empty', warn: undefined });
  });

  test('undeclared key (merchant custom field) is GraphQL-only best effort', () => {
    const withValue = resolveMetafield({ ref: REF, entry: entry() });
    expect(withValue).toMatchObject({ kind: 'value', value: 'Linen' });
    const hiddenOrAbsent = resolveMetafield({
      ref: REF,
      defaultValue: 'fallback'
    });
    expect(hiddenOrAbsent).toMatchObject({
      kind: 'default',
      value: 'fallback'
    });
  });

  test('declared type casing never causes a false mismatch', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor({ type: 'Short_Text' as never }),
      entry: entry()
    });
    expect(res).toMatchObject({ kind: 'value', value: 'Linen' });
  });

  test('meta prefers the declared type and carries name/placeholder', () => {
    const res = resolveMetafield({
      ref: REF,
      descriptor: descriptor({ isList: true }),
      entry: entry({ value: null })
    });
    expect((res as any).meta).toEqual({
      type: 'short_text',
      isList: true,
      name: 'Material',
      placeholder: 'Organic cotton',
      isDefault: true
    });
  });
});
