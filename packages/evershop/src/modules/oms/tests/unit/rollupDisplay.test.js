process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { addProcessor } from '../../../../lib/util/registry.js';
import {
  ROLLUP_DISPLAY,
  getRollupDisplay
} from '../../services/rollupDisplay.js';

describe('ROLLUP_DISPLAY', () => {
  it('has an entry for each of the seven rollup outputs', () => {
    expect(Object.keys(ROLLUP_DISPLAY).sort()).toEqual(
      [
        'canceled',
        'delivered',
        'partially_canceled',
        'partially_delivered',
        'partially_shipped',
        'pending',
        'shipped'
      ].sort()
    );
  });

  it('each entry has both name and badge', () => {
    for (const [code, entry] of Object.entries(ROLLUP_DISPLAY)) {
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.badge).toBe('string');
      expect(entry.badge.length).toBeGreaterThan(0);
      // Sanity: the key is a known rollup output.
      expect([
        'pending',
        'partially_shipped',
        'shipped',
        'partially_delivered',
        'delivered',
        'partially_canceled',
        'canceled'
      ]).toContain(code);
    }
  });
});

describe('getRollupDisplay()', () => {
  // Test order matters because getValueSync caches by (initValue, context) and
  // addProcessor doesn't invalidate the cache. Registering the processor first
  // ensures the cache is populated WITH the processor applied.
  it('applies a registered processor that overrides one entry', () => {
    addProcessor(
      'rollupDisplay',
      (display) => ({
        ...display,
        delivered: { name: 'Arrived', badge: 'success' }
      }),
      10
    );
    const display = getRollupDisplay();
    expect(display.delivered).toEqual({ name: 'Arrived', badge: 'success' });
    // The other entries stay intact (the processor only touched `delivered`).
    expect(display.pending).toEqual(ROLLUP_DISPLAY.pending);
    expect(display.canceled).toEqual(ROLLUP_DISPLAY.canceled);
  });
});
