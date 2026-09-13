import { describe, it, expect } from '@jest/globals';
import {
  touchesSql,
  classifyPlan,
  changesetKind,
  PLACEMENT_URN_PREFIX,
  INSTANCE_URN_PREFIX
} from '../../services/landingPage/pageBuilderOps.js';
import { fingerprint, countRenderable } from '../../services/landingPage/replaceHomepage.js';

describe('classifyPlan', () => {
  const now = new Date('2026-09-12T12:00:00Z');
  it.each([
    ['active', '2026-09-12T11:00:00Z', '2026-09-12T13:00:00Z'],
    ['active', '2026-09-12T11:00:00Z', null],
    ['upcoming', '2026-09-12T13:00:00Z', null],
    ['upcoming', '2026-09-12T13:00:00Z', '2026-09-13T00:00:00Z'],
    ['past', '2026-09-12T10:00:00Z', '2026-09-12T11:00:00Z'],
    ['past', '2026-09-12T10:00:00Z', '2026-09-12T12:00:00Z']
  ])('%s for start %s end %s', (expected, start, end) => {
    expect(classifyPlan({ start_time: start, end_time: end }, now)).toBe(expected);
  });
});

describe('changesetKind', () => {
  it('personal drafts are named pb-draft-<userId>; anything else is a detached rollout changeset', () => {
    expect(changesetKind('pb-draft-3')).toBe('draft');
    expect(changesetKind('Summer sale')).toBe('detachedRollout');
  });
});

describe('touchesSql', () => {
  const spec = {
    route: 'homepage',
    entityUrn: null,
    placementUuids: ['p1', 'p2'],
    instanceUuids: ['i1']
  };
  it('numbers parameters from startIndex and prefixes URNs', () => {
    const { sql, params } = touchesSql(spec, 2);
    expect(params).toEqual([
      'homepage',
      [PLACEMENT_URN_PREFIX + 'p1', PLACEMENT_URN_PREFIX + 'p2'],
      [INSTANCE_URN_PREFIX + 'i1'],
      ['i1']
    ]);
    expect(sql).toContain('op.route = $2');
    expect(sql).toContain("op.new_payload->>'route' = $2");
    expect(sql).toContain('op.entity_urn = ANY($3::text[])');
    expect(sql).toContain('op.entity_urn = ANY($4::text[])');
    expect(sql).toContain("op.new_payload->>'widget_instance_uuid' = ANY($5::text[])");
    expect(sql).not.toContain("new_payload->>'entity_urn'");
  });
  it('omits the route stamp and adds the entity clause for a landing page target', () => {
    const { sql, params } = touchesSql({ ...spec, route: null, entityUrn: 'urn:x' }, 1, 'o');
    expect(params[params.length - 1]).toBe('urn:x');
    expect(sql).not.toContain('o.route =');
    expect(sql).toContain("o.new_payload->>'entity_urn' = $4");
  });
});

describe('fingerprint', () => {
  it('is order-independent, case-insensitive and stable for the empty set', () => {
    expect(fingerprint(['B', 'a'])).toBe(fingerprint(['a', 'b']));
    expect(fingerprint([])).toBe(fingerprint([]));
    expect(fingerprint(['a'])).not.toBe(fingerprint(['b']));
    expect(fingerprint(['a'])).toHaveLength(64);
  });
});

describe('countRenderable', () => {
  const parent = '11111111-1111-4111-8111-111111111111';
  const row = (o: Partial<any>) => ({
    uuid: 'x', instance_uuid: 'y', area: 'landing_page_content', status: true, type: 'banner', settings_text: '', ...o
  });
  it('ignores hidden content rows, disabled instances, unregistered types and orphan children', () => {
    const body = [
      row({ instance_uuid: parent, type: 'columns' }),
      row({ area: `columnsContainer_${parent}_col_0` }),
      row({ area: 'columnsContainer_22222222-2222-4222-8222-222222222222_col_0' }),
      row({ area: 'content' }),
      row({ status: false }),
      row({ type: 'gone' })
    ];
    expect(countRenderable(body as any, new Set(['banner', 'columns']))).toBe(2);
  });
});
