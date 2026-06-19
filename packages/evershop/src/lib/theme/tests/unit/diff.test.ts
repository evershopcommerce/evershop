import { diffManifest, LiveDbState } from '../../diff.js';
import type { Manifest, PlacementRecord, WidgetRecord } from '../../manifest.js';

function W(
  uuid: string,
  name: string,
  settings: Record<string, unknown> = {},
  type = 'text_block'
): WidgetRecord {
  return { uuid, type, name, settings };
}
function P(
  uuid: string,
  widget: string,
  route = 'all',
  area = 'content',
  sort_order = 1
): PlacementRecord {
  return { uuid, widget_instance_uuid: widget, route, area, sort_order };
}
function man(widgets: WidgetRecord[] = [], placements: PlacementRecord[] = []): Manifest {
  return { theme_name: 't', version: '1.0.0', widgets, placements };
}
function live(
  widgets: Array<WidgetRecord & { status?: boolean }> = [],
  placements: PlacementRecord[] = []
): LiveDbState {
  return {
    widgets: new Map(widgets.map((w) => [w.uuid, w])),
    placements: new Map(placements.map((p) => [p.uuid, p]))
  };
}

// Run a widget-only settings diff and return the resulting UPDATE payload's
// settings (or undefined if no UPDATE was emitted) + conflicts.
function settingsDiff(
  s: Record<string, unknown>,
  m: Record<string, unknown>,
  d: Record<string, unknown>
) {
  const r = diffManifest(
    man([W('w1', 'n', s)]),
    man([W('w1', 'n', m)]),
    live([W('w1', 'n', d)])
  );
  const update = r.ops.find((o) => o.op === 'UPDATE');
  return {
    settings: update?.payload?.settings as Record<string, unknown> | undefined,
    conflicts: r.conflicts
  };
}

describe('diffManifest — per-widget classification (§ 7.2.2)', () => {
  test('added (—,M,—) → INSERT', () => {
    const r = diffManifest(man(), man([W('w1', 'n')]), live());
    expect(r.ops).toHaveLength(1);
    expect(r.ops[0]).toMatchObject({ op: 'INSERT', table: 'widget_instance', uuid: 'w1' });
    expect(r.counts.widgets_added).toBe(1);
  });

  test('collision (—,M,D) → throws', () => {
    expect(() =>
      diffManifest(man(), man([W('w1', 'n')]), live([W('w1', 'n')]))
    ).toThrow(/collision/);
  });

  test('removed (S,—,D) → DELETE', () => {
    const r = diffManifest(man([W('w1', 'n')]), man(), live([W('w1', 'n')]));
    expect(r.ops).toEqual([
      { table: 'widget_instance', op: 'DELETE', uuid: 'w1' }
    ]);
    expect(r.counts.widgets_removed).toBe(1);
  });

  test('already-removed (S,—,—) → no-op', () => {
    const r = diffManifest(man([W('w1', 'n')]), man(), live());
    expect(r.ops).toHaveLength(0);
  });

  test('user-deleted (S,M,—) → no-op', () => {
    const r = diffManifest(man([W('w1', 'n')]), man([W('w1', 'n2')]), live());
    expect(r.ops).toHaveLength(0);
  });

  test('shared with no change → no UPDATE', () => {
    const r = diffManifest(
      man([W('w1', 'n', { a: 1 })]),
      man([W('w1', 'n', { a: 1 })]),
      live([W('w1', 'n', { a: 1 })])
    );
    expect(r.ops).toHaveLength(0);
  });

  test('user-added widget (in D only) is left alone', () => {
    const r = diffManifest(man(), man(), live([W('user', 'mine')]));
    expect(r.ops).toHaveLength(0);
  });
});

describe('diffManifest — three-way merge on shared widget name (§ 7.2.3)', () => {
  test('S==M → no-op (user value preserved)', () => {
    const r = diffManifest(
      man([W('w1', 'same')]),
      man([W('w1', 'same')]),
      live([W('w1', 'userRenamed')])
    );
    expect(r.ops).toHaveLength(0);
  });

  test('S!=M, D==S → take M', () => {
    const r = diffManifest(
      man([W('w1', 'old')]),
      man([W('w1', 'new')]),
      live([W('w1', 'old')])
    );
    expect(r.ops[0]).toMatchObject({ op: 'UPDATE', payload: { name: 'new' } });
  });

  test('S!=M, D==M → no-op (already in sync)', () => {
    const r = diffManifest(
      man([W('w1', 'old')]),
      man([W('w1', 'new')]),
      live([W('w1', 'new')])
    );
    expect(r.ops).toHaveLength(0);
  });

  test('S!=M, D!=S!=M → conflict, user wins, no UPDATE', () => {
    const r = diffManifest(
      man([W('w1', 'old')]),
      man([W('w1', 'authorName')]),
      live([W('w1', 'userName')])
    );
    expect(r.ops).toHaveLength(0);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({
      widget_uuid: 'w1',
      field_path: 'name',
      manifest_value: 'authorName',
      user_value: 'userName'
    });
  });
});

describe('diffManifest — missing-key matrix (§ 7.2.4)', () => {
  test('row 2 (—,—,P) → keep user key, no UPDATE', () => {
    const { settings, conflicts } = settingsDiff({}, {}, { k: 1 });
    expect(settings).toBeUndefined();
    expect(conflicts).toHaveLength(0);
  });

  test('row 3 (—,P,—) → insert key', () => {
    const { settings } = settingsDiff({}, { k: 1 }, {});
    expect(settings).toEqual({ k: 1 });
  });

  test('row 4 (—,P,P==M) → no-op', () => {
    const { settings, conflicts } = settingsDiff({}, { k: 1 }, { k: 1 });
    expect(settings).toBeUndefined();
    expect(conflicts).toHaveLength(0);
  });

  test("row 4' (—,P,P!=M) → conflict, user wins", () => {
    const { settings, conflicts } = settingsDiff({}, { k: 1 }, { k: 2 });
    expect(settings).toBeUndefined();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field_path).toBe('settings.k');
  });

  test('row 5 (P,—,—) → no-op', () => {
    const { settings } = settingsDiff({ k: 1 }, {}, {});
    expect(settings).toBeUndefined();
  });

  test('row 6 (P,—,P==S) → delete key', () => {
    const { settings } = settingsDiff({ k: 1 }, {}, { k: 1 });
    expect(settings).toEqual({});
  });

  test("row 6' (P,—,P!=S) → conflict, user's key stays", () => {
    const { settings, conflicts } = settingsDiff({ k: 1 }, {}, { k: 2 });
    expect(settings).toBeUndefined();
    expect(conflicts).toHaveLength(1);
  });

  test('row 7 (P,P,—) → user deleted, stands', () => {
    const { settings } = settingsDiff({ k: 1 }, { k: 1 }, {});
    expect(settings).toBeUndefined();
  });

  test('row 8 (P,P,P) → scalar three-way (author changed, user did not)', () => {
    const { settings } = settingsDiff({ k: 1 }, { k: 2 }, { k: 1 });
    expect(settings).toEqual({ k: 2 });
  });
});

describe('diffManifest — recursion + opacity', () => {
  test('nested object two levels deep', () => {
    const { settings } = settingsDiff(
      { a: { b: 1 } },
      { a: { b: 2 } },
      { a: { b: 1 } }
    );
    expect(settings).toEqual({ a: { b: 2 } });
  });

  test('nested object three levels deep, user-customized sibling preserved', () => {
    const { settings, conflicts } = settingsDiff(
      { a: { b: { c: 1 }, x: 1 } },
      { a: { b: { c: 2 }, x: 1 } },
      { a: { b: { c: 1 }, x: 99 } }
    );
    expect(settings).toEqual({ a: { b: { c: 2 }, x: 99 } });
    expect(conflicts).toHaveLength(0);
  });

  test('arrays are opaque — replaced whole when author changed and user did not', () => {
    const { settings } = settingsDiff(
      { a: [1, 2] },
      { a: [1, 3] },
      { a: [1, 2] }
    );
    expect(settings).toEqual({ a: [1, 3] });
  });

  test('type mismatch at a key → scalar conflict, user wins', () => {
    const { settings, conflicts } = settingsDiff(
      { a: 1 },
      { a: { x: 1 } },
      { a: [1] }
    );
    expect(settings).toBeUndefined();
    expect(conflicts).toHaveLength(1);
  });

  test('conflict field_path reflects nesting', () => {
    const { conflicts } = settingsDiff(
      { hero: { cta_link: '/a' } },
      { hero: { cta_link: '/b' } },
      { hero: { cta_link: '/user' } }
    );
    expect(conflicts[0].field_path).toBe('settings.hero.cta_link');
  });
});

describe('diffManifest — canonical equality edge cases (§ 7.2.4)', () => {
  test('"100" (string) vs 100 (number) is drift → conflict', () => {
    const { conflicts } = settingsDiff({ k: 0 }, { k: '100' }, { k: 100 });
    expect(conflicts).toHaveLength(1);
  });
  test('true vs 1 is drift → conflict', () => {
    const { conflicts } = settingsDiff({ k: 0 }, { k: true }, { k: 1 });
    expect(conflicts).toHaveLength(1);
  });
  test('"" vs null is drift → conflict', () => {
    const { conflicts } = settingsDiff({ k: 0 }, { k: '' }, { k: null });
    expect(conflicts).toHaveLength(1);
  });
  test('100 vs 100.0 is NOT drift', () => {
    // author set 100, user set 100.0 → canonically equal → in sync, no-op
    const { settings, conflicts } = settingsDiff({ k: 0 }, { k: 100 }, { k: 100.0 });
    expect(settings).toBeUndefined();
    expect(conflicts).toHaveLength(0);
  });
});

describe('diffManifest — placements (§ 7.2.6)', () => {
  test('added placement → INSERT', () => {
    const r = diffManifest(
      man([W('w1', 'n')]),
      man([W('w1', 'n')], [P('p1', 'w1')]),
      live([W('w1', 'n')])
    );
    expect(r.ops.find((o) => o.table === 'widget_placement')).toMatchObject({
      op: 'INSERT',
      uuid: 'p1'
    });
    expect(r.counts.placements_added).toBe(1);
  });

  test('removed placement → DELETE', () => {
    const r = diffManifest(
      man([W('w1', 'n')], [P('p1', 'w1')]),
      man([W('w1', 'n')]),
      live([W('w1', 'n')], [P('p1', 'w1')])
    );
    expect(r.ops.find((o) => o.table === 'widget_placement')).toMatchObject({
      op: 'DELETE',
      uuid: 'p1'
    });
    expect(r.counts.placements_removed).toBe(1);
  });

  test('shared placement sort_order change → UPDATE', () => {
    const r = diffManifest(
      man([W('w1', 'n')], [P('p1', 'w1', 'all', 'content', 1)]),
      man([W('w1', 'n')], [P('p1', 'w1', 'all', 'content', 5)]),
      live([W('w1', 'n')], [P('p1', 'w1', 'all', 'content', 1)])
    );
    expect(r.ops.find((o) => o.op === 'UPDATE')).toMatchObject({
      table: 'widget_placement',
      payload: { sort_order: 5 }
    });
  });
});

describe('diffManifest — op ordering (§ 7.4)', () => {
  test('ops are ordered: del placements, del widgets, ins widgets, ins placements, upd widgets, upd placements', () => {
    const snapshot = man(
      [W('del', 'd'), W('upd', 'u', { x: 1 })],
      [P('pdel', 'del'), P('pupd', 'upd', 'all', 'content', 1)]
    );
    const manifest = man(
      [W('upd', 'u', { x: 2 }), W('add', 'a')],
      [P('padd', 'add'), P('pupd', 'upd', 'all', 'content', 9)]
    );
    const liveDb = live(
      [W('del', 'd'), W('upd', 'u', { x: 1 })],
      [P('pdel', 'del'), P('pupd', 'upd', 'all', 'content', 1)]
    );
    const r = diffManifest(snapshot, manifest, liveDb);
    const sig = r.ops.map((o) => `${o.op}:${o.table}:${o.uuid}`);
    expect(sig).toEqual([
      'DELETE:widget_placement:pdel',
      'DELETE:widget_instance:del',
      'INSERT:widget_instance:add',
      'INSERT:widget_placement:padd',
      'UPDATE:widget_instance:upd',
      'UPDATE:widget_placement:pupd'
    ]);
  });
});
