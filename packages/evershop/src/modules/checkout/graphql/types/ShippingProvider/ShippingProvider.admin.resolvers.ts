import type { ShippingProvider } from '../../../../../types/shippingProvider.js';
import {
  getAllShippingProviders,
  getShippingProvider
} from '../../../services/shipping/registry.js';

/**
 * Admin GraphQL resolvers for ShippingProvider and ShippingZoneProvider.
 *
 * Registry-only model: the in-memory registry (populated at bootstrap from
 * every provider extension's `registerShippingProvider(...)` call) IS the
 * provider list. There is no `shipping_provider` table to merge with —
 * installed = enabled, secrets live in `process.env`, per-zone state lives
 * in `shipping_zone_provider.config`.
 *
 * Query.shippingProviders / Query.shippingProvider now read straight from
 * the registry. ShippingZoneProvider.provider is resolved by mapping the
 * attachment row's `provider_code` back to the registry. Orphan attachments
 * (provider uninstalled) resolve to `null`.
 */

interface RegistryProviderProjection {
  code: string;
  name: string;
  description: string | null;
  zoneConfigFields: unknown[] | null;
}

function project(p: ShippingProvider): RegistryProviderProjection {
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? null,
    zoneConfigFields:
      p.zoneConfigFields && p.zoneConfigFields.length > 0
        ? p.zoneConfigFields
        : null
  };
}

export default {
  Query: {
    shippingProviders: async (): Promise<RegistryProviderProjection[]> => {
      const registered = await getAllShippingProviders();
      return registered.map(project);
    },
    shippingProvider: async (
      _: unknown,
      { code }: { code: string }
    ): Promise<RegistryProviderProjection | null> => {
      const registered = await getShippingProvider(code);
      return registered ? project(registered) : null;
    }
  },
  ShippingZoneProvider: {
    provider: async (parent: {
      providerCode?: string;
    }): Promise<RegistryProviderProjection | null> => {
      if (!parent.providerCode) return null;
      const registered = await getShippingProvider(parent.providerCode);
      return registered ? project(registered) : null;
    },
    config: (parent: { config?: unknown }) =>
      (parent.config as Record<string, unknown>) ?? {}
  }
};
