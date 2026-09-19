/**
 * Phase 3a — overlay engine conflict-rule tests.
 *
 * Covers the cases enumerated in spec 03 § 6.3:
 *   - INSERT / UPDATE / DELETE on widget_instance
 *   - INSERT / UPDATE / DELETE on widget_placement
 *   - UPDATE on a missing entity is silently skipped (publish-delete wins)
 *   - DELETE of a widget cascades to its placements in memory
 *   - INSERT of a placement skipped when its parent widget isn't in the set
 *   - Operations applied in change_order
 */

import {
  applyOverlayToWidgets,
  OverlayPlacement,
  OverlayWidget
} from '../../services/applyOverlayToWidgets.js';
import type { ChangesetOperationRow } from '../../../../types/db/index.js';

const WIDGET_A = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const WIDGET_B = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PLACEMENT_P1 = '33333333-1111-1111-1111-111111111111';
const PLACEMENT_P2 = '44444444-2222-2222-2222-222222222222';

function widgetUrn(uuid: string): string {
  return `urn:evershop:cms:widget_instance:${uuid}`;
}
function placementUrn(uuid: string): string {
  return `urn:evershop:cms:widget_placement:${uuid}`;
}

function makeWidget(uuid: string, overrides: Partial<OverlayWidget> = {}): OverlayWidget {
  return {
    uuid,
    type: 'text_block',
    status: true,
    settings: {},
    ...overrides
  };
}
function makePlacement(
  uuid: string,
  widgetUuid: string,
  overrides: Partial<OverlayPlacement> = {}
): OverlayPlacement {
  return {
    uuid,
    widget_instance_uuid: widgetUuid,
    route: 'home',
    area: 'content',
    sort_order: 1,
    entity_urn: null,
    ...overrides
  };
}

function op(
  partial: Partial<ChangesetOperationRow> & {
    entity_urn: string;
    change_order: number;
  }
): ChangesetOperationRow {
  return {
    changeset_operation_id: 0,
    uuid: '00000000-0000-0000-0000-000000000000',
    changeset_id: 1,
    route: partial.route ?? 'home',
    entity_urn: partial.entity_urn,
    old_payload: partial.old_payload ?? null,
    new_payload: partial.new_payload ?? null,
    change_order: partial.change_order,
    created_at: new Date()
  };
}

describe('applyOverlayToWidgets — widget_instance ops', () => {
  it('INSERT adds the widget to the map', () => {
    const widgets = new Map<string, OverlayWidget>();
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: widgetUrn(WIDGET_A),
        new_payload: { type: 'banner', status: true, settings: { src: '/x' } },
        change_order: 1
      })
    ]);
    expect(widgets.has(WIDGET_A)).toBe(true);
    expect(widgets.get(WIDGET_A)!.type).toBe('banner');
    expect(widgets.get(WIDGET_A)!.settings).toEqual({ src: '/x' });
  });

  it('UPDATE on an existing widget merges non-settings fields and replaces settings', () => {
    const widgets = new Map([
      [WIDGET_A, makeWidget(WIDGET_A, { settings: { color: 'blue' } })]
    ]);
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: widgetUrn(WIDGET_A),
        old_payload: { settings: { color: 'blue' } },
        new_payload: { type: 'text_block', settings: { color: 'red' } },
        change_order: 1
      })
    ]);
    expect(widgets.get(WIDGET_A)!.settings).toEqual({ color: 'red' });
    expect(widgets.get(WIDGET_A)!.type).toBe('text_block');
  });

  it('UPDATE with only settings preserves source type and status', () => {
    const widgets = new Map([
      [
        WIDGET_A,
        makeWidget(WIDGET_A, {
          type: 'banner',
          status: true,
          settings: { src: '/old' }
        })
      ]
    ]);
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: widgetUrn(WIDGET_A),
        old_payload: { settings: { src: '/old' } },
        new_payload: { settings: { src: '/new', alt: 'A' } },
        change_order: 1
      })
    ]);
    const w = widgets.get(WIDGET_A)!;
    expect(w.type).toBe('banner'); // preserved
    expect(w.status).toBe(true); // preserved
    expect(w.settings).toEqual({ src: '/new', alt: 'A' }); // replaced
  });

  it('UPDATE on a missing widget is silently skipped (publish-delete wins, S13)', () => {
    const widgets = new Map<string, OverlayWidget>(); // widget A NOT present
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: widgetUrn(WIDGET_A),
        old_payload: { settings: { color: 'blue' } },
        new_payload: { type: 'text_block', settings: { color: 'red' } },
        change_order: 1
      })
    ]);
    expect(widgets.has(WIDGET_A)).toBe(false);
  });

  it('DELETE removes the widget AND its placements from memory', () => {
    const widgets = new Map([[WIDGET_A, makeWidget(WIDGET_A)]]);
    const placements = new Map([
      [PLACEMENT_P1, makePlacement(PLACEMENT_P1, WIDGET_A)],
      [PLACEMENT_P2, makePlacement(PLACEMENT_P2, WIDGET_B)]
    ]);
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: widgetUrn(WIDGET_A),
        old_payload: { type: 'text_block' },
        new_payload: null,
        change_order: 1
      })
    ]);
    expect(widgets.has(WIDGET_A)).toBe(false);
    expect(placements.has(PLACEMENT_P1)).toBe(false);
    expect(placements.has(PLACEMENT_P2)).toBe(true);
  });
});

describe('applyOverlayToWidgets — widget_placement ops', () => {
  it('INSERT adds the placement when its widget is in the map', () => {
    const widgets = new Map([[WIDGET_A, makeWidget(WIDGET_A)]]);
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: placementUrn(PLACEMENT_P1),
        new_payload: {
          widget_instance_uuid: WIDGET_A,
          route: 'home',
          area: 'hero',
          sort_order: 1
        },
        change_order: 1
      })
    ]);
    expect(placements.has(PLACEMENT_P1)).toBe(true);
    expect(placements.get(PLACEMENT_P1)!.area).toBe('hero');
  });

  it('INSERT skipped if its parent widget is missing from the map', () => {
    const widgets = new Map<string, OverlayWidget>(); // empty
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: placementUrn(PLACEMENT_P1),
        new_payload: { widget_instance_uuid: WIDGET_A, route: 'home', area: 'x', sort_order: 1 },
        change_order: 1
      })
    ]);
    expect(placements.size).toBe(0);
  });

  it('UPDATE on a missing placement is silently skipped', () => {
    const widgets = new Map([[WIDGET_A, makeWidget(WIDGET_A)]]);
    const placements = new Map<string, OverlayPlacement>(); // P1 NOT present
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: placementUrn(PLACEMENT_P1),
        old_payload: { area: 'old' },
        new_payload: { widget_instance_uuid: WIDGET_A, route: 'home', area: 'new', sort_order: 2 },
        change_order: 1
      })
    ]);
    expect(placements.has(PLACEMENT_P1)).toBe(false);
  });

  it('DELETE removes the placement', () => {
    const widgets = new Map([[WIDGET_A, makeWidget(WIDGET_A)]]);
    const placements = new Map([
      [PLACEMENT_P1, makePlacement(PLACEMENT_P1, WIDGET_A)]
    ]);
    applyOverlayToWidgets(widgets, placements, [
      op({
        entity_urn: placementUrn(PLACEMENT_P1),
        old_payload: { area: 'content' },
        new_payload: null,
        change_order: 1
      })
    ]);
    expect(placements.has(PLACEMENT_P1)).toBe(false);
  });
});

describe('applyOverlayToWidgets — ordering', () => {
  it('applies ops in change_order ascending regardless of input order', () => {
    const widgets = new Map<string, OverlayWidget>();
    const placements = new Map<string, OverlayPlacement>();
    applyOverlayToWidgets(widgets, placements, [
      // Out-of-order in the input array
      op({
        entity_urn: placementUrn(PLACEMENT_P1),
        new_payload: { widget_instance_uuid: WIDGET_A, route: 'home', area: 'hero', sort_order: 1 },
        change_order: 2
      }),
      op({
        entity_urn: widgetUrn(WIDGET_A),
        new_payload: { type: 'banner', status: true, settings: {} },
        change_order: 1
      })
    ]);
    // Widget INSERT (order 1) ran before placement INSERT (order 2),
    // so the placement was kept (its parent existed in the map by then).
    expect(widgets.has(WIDGET_A)).toBe(true);
    expect(placements.has(PLACEMENT_P1)).toBe(true);
  });
});
