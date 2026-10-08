import { diffManifest, LandingPageLiveRow, LiveDbState } from '../../diff.js';
import { landingPageUrn } from '../../landingPages.js';
import type {
  LandingPageRecord,
  Manifest,
  PlacementRecord,
  WidgetRecord
} from '../../manifest.js';

/**
 * Landing pages in the three-way diff (theme-json-landing-pages § 5). The page
 * ROW is never deleted — pages are not theme property — so the matrix differs
 * from widgets in exactly one place: "dropped from the manifest" releases the
 * body and reports the page instead of removing it.
 */
const PAGE = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const W1 = '11111111-1111-4111-8111-111111111111';
const B1 = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const URN = landingPageUrn(PAGE);

function W(uuid = W1, name = 'Hero'): WidgetRecord {
  return { uuid, type: 'banner', name, settings: {} };
}
function page(over: Partial<LandingPageRecord> = {}): LandingPageRecord {
  return {
    uuid: PAGE,
    name: 'Black Friday',
    description: null,
    meta_title: null,
    meta_description: null,
    status: true,
    placements: [
      { uuid: B1, widget_instance_uuid: W1, area: 'landing_page_content', sort_order: 10 }
    ],
    ...over
  };
}
function man(pages: LandingPageRecord[] = [], widgets: WidgetRecord[] = [W()]): Manifest {
  return { theme_name: 't', version: '1.0.0', widgets, placements: [], landingPages: pages };
}
function liveRow(over: Partial<LandingPageLiveRow> = {}): LandingPageLiveRow {
  return {
    uuid: PAGE,
    name: 'Black Friday',
    description: null,
    meta_title: null,
    meta_description: null,
    status: true,
    ...over
  };
}
function live(
  pages: LandingPageLiveRow[] = [],
  widgets: WidgetRecord[] = [],
  placements: Array<PlacementRecord & { entity_urn?: string | null }> = []
): LiveDbState {
  return {
    widgets: new Map(widgets.map((w) => [w.uuid, w])),
    placements: new Map(placements.map((p) => [p.uuid, p])),
    landingPages: new Map(pages.map((p) => [p.uuid, p]))
  };
}
const body = (over = {}) => ({
  uuid: B1,
  widget_instance_uuid: W1,
  route: 'landingPageView',
  area: 'landing_page_content',
  sort_order: 10,
  entity_urn: URN,
  ...over
});

describe('landing pages in diffManifest', () => {
  test('new in the manifest → page INSERT before its body, both counted', () => {
    const d = diffManifest(man([]), man([page()]), live([], [W()]));
    const kinds = d.ops.map((o) => `${o.table}:${o.op}`);
    expect(kinds).toEqual(['landing_page:INSERT', 'widget_placement:INSERT']);
    expect(d.counts.landing_pages_added).toBe(1);
    expect(d.counts.placements_added).toBe(1);
    // The nested placement is stamped with the route + scope by the diff.
    const pl = d.ops.find((o) => o.table === 'widget_placement')!;
    expect(pl.payload).toMatchObject({
      route: 'landingPageView',
      area: 'landing_page_content',
      entity_urn: URN
    });
    // url_key is NOT in the payload — install generates it from the name.
    expect(d.ops[0].payload).not.toHaveProperty('url_key');
    expect(d.ops[0].payload).toMatchObject({ name: 'Black Friday', status: true });
  });

  test('author edits a field the merchant never touched → UPDATE', () => {
    const d = diffManifest(
      man([page()]),
      man([page({ meta_title: 'BF | Store' })]),
      live([liveRow()], [W()], [body()])
    );
    const up = d.ops.find((o) => o.table === 'landing_page')!;
    expect(up.op).toBe('UPDATE');
    expect(up.payload).toEqual({ meta_title: 'BF | Store' });
    expect(d.counts.landing_pages_updated).toBe(1);
    expect(d.conflicts).toEqual([]);
  });

  test('both changed the same field → merchant wins, conflict logged', () => {
    const d = diffManifest(
      man([page()]),
      man([page({ name: 'Black Friday 2026' })]),
      live([liveRow({ name: 'Our Big Sale' })], [W()], [body()])
    );
    expect(d.ops.some((o) => o.table === 'landing_page')).toBe(false);
    expect(d.conflicts).toEqual([
      expect.objectContaining({
        widget_uuid: PAGE,
        field_path: 'landingPages.name',
        manifest_value: 'Black Friday 2026',
        user_value: 'Our Big Sale'
      })
    ]);
  });

  test('merchant unpublished a page the theme ships → stays unpublished', () => {
    const d = diffManifest(
      man([page({ status: true })]),
      man([page({ status: true })]),
      live([liveRow({ status: false })], [W()], [body()])
    );
    expect(d.ops.some((o) => o.table === 'landing_page')).toBe(false);
    expect(d.conflicts).toEqual([]);
  });

  test('merchant deleted the page → never re-created, body skipped entirely', () => {
    const d = diffManifest(man([page()]), man([page()]), live([], [W()], []));
    expect(d.ops).toEqual([]);
    expect(d.counts.landing_pages_added).toBe(0);
    expect(d.counts.placements_added).toBe(0);
  });

  test('merchant deleted the page and the author adds a widget to it → still nothing', () => {
    const grown = page({
      placements: [
        { uuid: B1, widget_instance_uuid: W1, area: 'landing_page_content', sort_order: 10 },
        {
          uuid: 'cccccccc-1111-4111-8111-cccccccccccc',
          widget_instance_uuid: W1,
          area: 'landing_page_content',
          sort_order: 20
        }
      ]
    });
    const d = diffManifest(man([page()]), man([grown]), live([], [W()], []));
    expect(d.ops.filter((o) => o.table === 'widget_placement')).toEqual([]);
  });

  test('dropped from the manifest → row kept, body released, page reported', () => {
    const d = diffManifest(man([page()]), man([]), live([liveRow()], [W()], [body()]));
    // No landing_page op at all: the row survives.
    expect(d.ops.some((o) => o.table === 'landing_page')).toBe(false);
    // Its placement is gone, because it is no longer in the manifest.
    expect(d.ops).toEqual([
      expect.objectContaining({ table: 'widget_placement', op: 'DELETE', uuid: B1 })
    ]);
    expect(d.counts.landing_pages_released).toBe(1);
    expect(d.releasedLandingPages).toEqual([{ uuid: PAGE, name: 'Black Friday' }]);
  });

  test('adopted page (in M and D, not in S) → fields untouched', () => {
    const d = diffManifest(
      man([]),
      man([page({ name: 'Black Friday' })]),
      live([liveRow({ name: 'Renamed by merchant' })], [W()], [body()])
    );
    expect(d.ops.some((o) => o.table === 'landing_page')).toBe(false);
    expect(d.counts.landing_pages_added).toBe(0);
  });

  test('a body placement moved by the author → UPDATE, scope never re-merged', () => {
    const d = diffManifest(
      man([page()]),
      man([
        page({
          placements: [
            { uuid: B1, widget_instance_uuid: W1, area: 'landing_page_content', sort_order: 99 }
          ]
        })
      ]),
      live([liveRow()], [W()], [body()])
    );
    const up = d.ops.find((o) => o.table === 'widget_placement')!;
    expect(up.op).toBe('UPDATE');
    expect(up.payload).toEqual({ sort_order: 99 });
    expect(up.payload).not.toHaveProperty('entity_urn');
  });

  test('a manifest with no landingPages section behaves exactly as before', () => {
    const plain: Manifest = {
      theme_name: 't',
      version: '1.0.0',
      widgets: [W()],
      placements: []
    };
    const d = diffManifest(plain, plain, live([], [W()]));
    expect(d.ops).toEqual([]);
    expect(d.counts.landing_pages_added).toBe(0);
    expect(d.releasedLandingPages).toEqual([]);
  });
});

describe('adoption on the upgrade path', () => {
  // The author's own store: theme installed, more content built in the page
  // builder, exported into a higher version, re-activated. Those rows are in
  // the manifest and the DB but not the snapshot. Before this was adoption the
  // diff threw "theme diff collision" and the activation failed outright.
  test('a widget newly declared by the manifest but already in the DB is adopted', () => {
    const w = W();
    const d = diffManifest(
      { theme_name: 't', version: '1.0.0', widgets: [], placements: [] },
      { theme_name: 't', version: '1.1.0', widgets: [w], placements: [] },
      live([], [w])
    );
    expect(d.ops).toEqual([]);
    expect(d.adopted.widgets).toBe(1);
    expect(d.counts.widgets_added).toBe(0);
  });

  test('a landing page and its body built in the page builder are adopted whole', () => {
    const d = diffManifest(
      man([]),
      man([page()]),
      live([liveRow()], [W()], [body()])
    );
    expect(d.ops).toEqual([]);
    expect(d.adopted).toEqual({ widgets: 0, placements: 1, landingPages: 1 });
  });
});
