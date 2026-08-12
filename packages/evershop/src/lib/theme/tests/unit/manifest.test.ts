import {
  Manifest,
  ValidationContext,
  validateManifest,
  warnUnknownTypes
} from '../../manifest.js';

// Valid UUID v4 strings (version nibble = 4, variant nibble = 8).
const W1 = '11111111-1111-4111-8111-111111111111';
const W2 = '22222222-2222-4222-8222-222222222222';
const P1 = '33333333-3333-4333-8333-333333333333';
const P2 = '44444444-4444-4444-8444-444444444444';
const COLS = '55555555-5555-4555-8555-555555555555';

function validManifest(): Manifest {
  return {
    theme_name: 'Boutique',
    version: '1.0.0',
    widgets: [{ uuid: W1, type: 'text_block', name: 'Hi', settings: {} }],
    placements: [
      {
        uuid: P1,
        widget_instance_uuid: W1,
        route: 'all',
        area: 'content',
        sort_order: 1
      }
    ]
  };
}

function fakePool(rows: Array<{ uuid: string; theme: string | null }> = []): any {
  return { query: async () => ({ rows }) };
}
const ctx = (
  rows: Array<{ uuid: string; theme: string | null }> = []
): ValidationContext => ({ themeId: 'boutique', pool: fakePool(rows) });

describe('validateManifest', () => {
  test('a well-formed manifest produces no errors', async () => {
    expect(await validateManifest(validManifest(), ctx())).toEqual([]);
  });

  test('non-array widgets/placements is a top-level error', async () => {
    const m = { ...validManifest(), widgets: 'nope' } as unknown as Manifest;
    const errs = await validateManifest(m, ctx());
    expect(errs.some((e) => e.scope === 'top-level')).toBe(true);
  });

  test('empty version is a top-level error', async () => {
    const m = { ...validManifest(), version: '' };
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some(
        (e) => e.scope === 'top-level' && /version/.test(e.message)
      )
    ).toBe(true);
  });

  test('missing version is a top-level error', async () => {
    const m = { ...validManifest() } as Partial<Manifest>;
    delete m.version;
    const errs = await validateManifest(m as Manifest, ctx());
    expect(
      errs.some(
        (e) => e.scope === 'top-level' && /version/.test(e.message)
      )
    ).toBe(true);
  });

  test.each(['1.2', '1', 'abc', '1.0.0.0', ''])(
    'non-SemVer version %s is a top-level error',
    async (v) => {
      const m = { ...validManifest(), version: v };
      const errs = await validateManifest(m, ctx());
      expect(
        errs.some((e) => e.scope === 'top-level' && /SemVer/.test(e.message))
      ).toBe(true);
    }
  );

  test.each(['1.0.0', '2.3.4', '1.0.0-beta.1', '0.0.1'])(
    'valid SemVer version %s passes',
    async (v) => {
      const m = { ...validManifest(), version: v };
      const errs = await validateManifest(m, ctx());
      expect(errs.filter((e) => /version/.test(e.message))).toEqual([]);
    }
  );

  test('invalid widget uuid', async () => {
    const m = validManifest();
    m.widgets[0].uuid = 'not-a-uuid';
    const errs = await validateManifest(m, ctx());
    expect(errs.some((e) => e.scope === 'widget' && /UUID v4/.test(e.message))).toBe(
      true
    );
  });

  test('empty widget type', async () => {
    const m = validManifest();
    m.widgets[0].type = '';
    const errs = await validateManifest(m, ctx());
    expect(errs.some((e) => e.scope === 'widget' && /type/.test(e.message))).toBe(
      true
    );
  });

  test('non-object widget settings', async () => {
    const m = validManifest();
    (m.widgets[0] as { settings: unknown }).settings = 'x';
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'widget' && /settings/.test(e.message))
    ).toBe(true);
  });

  test('placement references unknown widget', async () => {
    const m = validManifest();
    m.placements[0].widget_instance_uuid = W2;
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'placement' && /no matching widget/.test(e.message))
    ).toBe(true);
  });

  test('placement with non-numeric sort_order', async () => {
    const m = validManifest();
    (m.placements[0] as { sort_order: unknown }).sort_order = 'x';
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'placement' && /sort_order/.test(e.message))
    ).toBe(true);
  });

  test('placement with entity_urn is rejected', async () => {
    const m = validManifest();
    (m.placements[0] as { entity_urn?: unknown }).entity_urn =
      'urn:evershop:cms:page:x';
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'placement' && /entity_urn/.test(e.message))
    ).toBe(true);
  });

  test('duplicate widget uuid is a cross-record error', async () => {
    const m = validManifest();
    m.widgets.push({ uuid: W1, type: 'text_block', name: 'Dup', settings: {} });
    const errs = await validateManifest(m, ctx());
    expect(errs.some((e) => e.scope === 'cross-record')).toBe(true);
  });

  test('a uuid used by both a widget and a placement is a cross-record error', async () => {
    const m = validManifest();
    m.placements[0].uuid = W1; // collide with the widget's uuid
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'cross-record' && /both/.test(e.message))
    ).toBe(true);
  });

  test('synthetic-area parent missing from widgets[]', async () => {
    const m = validManifest();
    m.placements[0].area = `columnsContainer_${COLS}_col_0`;
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'placement' && /not in widgets/.test(e.message))
    ).toBe(true);
  });

  test('synthetic-area parent of the wrong type', async () => {
    const m = validManifest();
    // Parent exists but is a text_block, not columns.
    m.widgets.push({ uuid: COLS, type: 'text_block', name: 'NotCols', settings: {} });
    m.placements.push({
      uuid: P2,
      widget_instance_uuid: W1,
      route: 'all',
      area: `columnsContainer_${COLS}_col_0`,
      sort_order: 2
    });
    const errs = await validateManifest(m, ctx());
    expect(
      errs.some((e) => e.scope === 'placement' && /'columns'/.test(e.message))
    ).toBe(true);
  });

  test('synthetic-area parent of type columns is accepted', async () => {
    const m = validManifest();
    m.widgets.push({ uuid: COLS, type: 'columns', name: 'Cols', settings: {} });
    m.placements.push({
      uuid: P2,
      widget_instance_uuid: W1,
      route: 'all',
      area: `columnsContainer_${COLS}_col_0`,
      sort_order: 2
    });
    expect(await validateManifest(m, ctx())).toEqual([]);
  });

  test('DB collision: widget exists under a different theme', async () => {
    const errs = await validateManifest(
      validManifest(),
      ctx([{ uuid: W1, theme: 'another-theme' }])
    );
    expect(errs.some((e) => e.scope === 'db')).toBe(true);
  });

  test('no DB collision when the existing row is the same theme', async () => {
    const errs = await validateManifest(
      validManifest(),
      ctx([{ uuid: W1, theme: 'boutique' }])
    );
    expect(errs.filter((e) => e.scope === 'db')).toEqual([]);
  });
});

describe('warnUnknownTypes', () => {
  function tracker() {
    const calls: string[] = [];
    return { warn: (m: string) => calls.push(m), calls };
  }

  test('warns for unknown types but never blocks', () => {
    const { warn, calls } = tracker();
    warnUnknownTypes(validManifest(), new Set(['banner']), warn);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/text_block/);
  });

  test('does not warn when the type is known', () => {
    const { warn, calls } = tracker();
    warnUnknownTypes(validManifest(), new Set(['text_block']), warn);
    expect(calls).toHaveLength(0);
  });

  test("stays silent on an empty DB (can't distinguish typo from new module)", () => {
    const { warn, calls } = tracker();
    warnUnknownTypes(validManifest(), new Set(), warn);
    expect(calls).toHaveLength(0);
  });
});
