import { contentFingerprint } from '../../fingerprint.js';
import type { Manifest } from '../../manifest.js';

const base: Manifest = {
  theme_name: 'Boutique',
  version: '1.0.0',
  widgets: [{ uuid: 'w1', type: 'text_block', name: 'Hi', settings: {} }],
  placements: []
};

describe('contentFingerprint', () => {
  test('different theme_name → same fingerprint', () => {
    expect(contentFingerprint(base)).toBe(
      contentFingerprint({ ...base, theme_name: 'Other' })
    );
  });

  test('different version → same fingerprint', () => {
    expect(contentFingerprint(base)).toBe(
      contentFingerprint({ ...base, version: '2.0.0' })
    );
  });

  test('reordering widgets[] → DIFFERENT fingerprint', () => {
    const two: Manifest = {
      ...base,
      widgets: [
        { uuid: 'w1', type: 'text_block', name: 'A', settings: {} },
        { uuid: 'w2', type: 'text_block', name: 'B', settings: {} }
      ]
    };
    const swapped: Manifest = { ...two, widgets: [two.widgets[1], two.widgets[0]] };
    expect(contentFingerprint(two)).not.toBe(contentFingerprint(swapped));
  });

  test('modifying widget settings → different fingerprint', () => {
    const mod: Manifest = {
      ...base,
      widgets: [{ ...base.widgets[0], settings: { heading: 'x' } }]
    };
    expect(contentFingerprint(base)).not.toBe(contentFingerprint(mod));
  });

  test('adding a placement → different fingerprint', () => {
    const withP: Manifest = {
      ...base,
      placements: [
        {
          uuid: 'p1',
          widget_instance_uuid: 'w1',
          route: 'all',
          area: 'content',
          sort_order: 1
        }
      ]
    };
    expect(contentFingerprint(base)).not.toBe(contentFingerprint(withP));
  });
});
