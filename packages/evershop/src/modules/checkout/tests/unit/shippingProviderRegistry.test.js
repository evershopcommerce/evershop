process.env.ALLOW_CONFIG_MUTATIONS = 'true';

import {
  __resetShippingProviderRegistryForTests,
  registerShippingProvider
} from '../../services/shipping/registry.js';

describe('registerShippingProvider', () => {
  beforeEach(() => {
    __resetShippingProviderRegistryForTests();
  });

  const validProvider = (code = 'shippo') => ({
    code,
    name: `${code} provider`,
    getMethods: async () => []
  });

  it('rejects providers with missing code or name', () => {
    expect(() =>
      registerShippingProvider({
        name: 'no code',
        getMethods: async () => []
      })
    ).toThrow(/code is required/);
    expect(() =>
      registerShippingProvider({
        code: 'no-name',
        getMethods: async () => []
      })
    ).toThrow(/name is required/);
  });

  it('rejects providers missing getMethods', () => {
    expect(() =>
      registerShippingProvider({ code: 'broken', name: 'Broken' })
    ).toThrow(/getMethods is required/);
  });

  it('throws eagerly when the same code is registered twice', () => {
    // First registration lands.
    registerShippingProvider(validProvider('dup_check'));
    // Second registration with the same code throws AT REGISTRATION —
    // not deferred to the first getAllShippingProviders call. Without
    // the eager check, a second extension shipping 'shippo' would
    // silently shadow the first one until the registry materialized.
    expect(() =>
      registerShippingProvider(validProvider('dup_check'))
    ).toThrow(/already registered/);
  });

  it('allows distinct codes', () => {
    expect(() => {
      registerShippingProvider(validProvider('alpha'));
      registerShippingProvider(validProvider('beta'));
      registerShippingProvider(validProvider('gamma'));
    }).not.toThrow();
  });
});
