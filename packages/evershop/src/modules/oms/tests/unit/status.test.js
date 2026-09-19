process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { registerShipmentStatus } from '../../services/statusManager.js';

describe('registerShipmentStatus phase validation', () => {
  it('throws when phase is missing', () => {
    expect(() =>
      registerShipmentStatus('foo_status_no_phase', {
        name: 'Foo',
        badge: 'default'
      })
    ).toThrow(/must declare phase/);
  });

  it('throws when phase is an unknown value', () => {
    expect(() =>
      registerShipmentStatus('foo_status_bad_phase', {
        name: 'Foo',
        badge: 'default',
        phase: 'in_transit'
      })
    ).toThrow(/must declare phase/);
  });

  it('throws when phase is the removed `pending` value', () => {
    expect(() =>
      registerShipmentStatus('foo_status_pending_phase', {
        name: 'Foo',
        badge: 'default',
        phase: 'pending'
      })
    ).toThrow(/must declare phase/);
  });

  it('throws when the id contains spaces', () => {
    expect(() =>
      registerShipmentStatus('bad id', {
        name: 'Bad',
        badge: 'default',
        phase: 'shipped'
      })
    ).toThrow(/non-empty string without spaces/);
  });

  it('succeeds when phase is one of the three valid values', () => {
    const validPhases = ['shipped', 'delivered', 'canceled'];
    for (const phase of validPhases) {
      expect(() =>
        registerShipmentStatus(`ok_${phase}_status`, {
          name: `Ok ${phase}`,
          badge: 'default',
          phase
        })
      ).not.toThrow();
    }
  });

  it('throws when the same code is registered twice', () => {
    // First registration lands.
    registerShipmentStatus('dup_check_status', {
      name: 'First',
      badge: 'default',
      phase: 'shipped'
    });
    // Second registration with the same id throws — silently overwriting was the
    // bug. Extensions that want to mutate an existing entry must use addProcessor.
    expect(() =>
      registerShipmentStatus('dup_check_status', {
        name: 'Second',
        badge: 'destructive',
        phase: 'canceled'
      })
    ).toThrow(/already registered/);
  });
});
