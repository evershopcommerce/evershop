import { computeDefinitionStatus } from '../../definitionStatus.js';

describe('computeDefinitionStatus — the guideline drawer matrix', () => {
  const declared = { type: 'short_text' };

  test('declared + missing → missing-declared (create offered)', () => {
    expect(computeDefinitionStatus(declared, null)).toEqual({
      kind: 'missing-declared'
    });
  });

  test('declared + identical existing → exists (case-insensitive type)', () => {
    expect(
      computeDefinitionStatus(declared, { type: 'SHORT_TEXT', isList: false })
    ).toEqual({ kind: 'exists' });
  });

  test('type or isList mismatch → conflict naming the immutables', () => {
    const byType = computeDefinitionStatus(declared, { type: 'rich_text' });
    expect(byType.kind).toBe('conflict');
    expect((byType as any).details).toEqual([
      { field: 'type', declared: 'short_text', existing: 'rich_text' }
    ]);
    const byList = computeDefinitionStatus(
      { type: 'short_text', isList: true },
      { type: 'short_text' }
    );
    expect((byList as any).details).toEqual([
      { field: 'isList', declared: true, existing: false }
    ]);
  });

  test('undeclared field: exists-undeclared vs missing-undeclared', () => {
    expect(computeDefinitionStatus(null, { type: 'url' })).toEqual({
      kind: 'exists-undeclared'
    });
    expect(computeDefinitionStatus(undefined, null)).toEqual({
      kind: 'missing-undeclared'
    });
  });
});
