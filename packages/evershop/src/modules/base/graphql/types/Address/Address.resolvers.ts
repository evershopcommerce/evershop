import { getRegions } from '../../../../../lib/address/regions.js';
import type { AddressSurface } from '../../../../../lib/address/types.js';
import { getActiveLocale } from '../../../../../lib/locale/localeContext.js';
import {
  addressFieldResolvers,
  toRegionGraphql
} from '../../../services/address/graphqlAddress.js';
import { resolveStoreAddressSchema } from '../../../services/address/resolveStoreAddressSchema.js';

// `JSON: GraphQLJSON` is registered by Metafield.resolvers.ts; the duplicate
// `scalar JSON` declaration merges, the resolver must be registered once.

const SURFACES: readonly string[] = ['account', 'shipping', 'billing'];

async function listRegions(
  country: string,
  parentPath: string[] | null | undefined,
  locale: string | null | undefined
) {
  const effectiveLocale = locale ?? getActiveLocale();
  const regions = await getRegions(country, parentPath ?? [], effectiveLocale);
  return regions.map((region) => toRegionGraphql(region, country, effectiveLocale));
}

export default {
  Query: {
    addressSchema: (
      _: unknown,
      {
        country,
        locale,
        surface
      }: { country?: string | null; locale?: string | null; surface?: string | null }
    ) =>
      resolveStoreAddressSchema(
        country,
        locale,
        surface && SURFACES.includes(surface) ? (surface as AddressSurface) : undefined
      ),
    regions: (
      _: unknown,
      {
        country,
        parentPath,
        locale
      }: { country: string; parentPath?: string[] | null; locale?: string | null }
    ) => listRegions(country, parentPath, locale)
  },
  Country: {
    regions: (
      country: { code: string },
      { parentPath, locale }: { parentPath?: string[] | null; locale?: string | null }
    ) => listRegions(country.code, parentPath, locale)
  },
  Address: {
    __resolveType: (obj: { __typename?: string }) => obj && obj.__typename
  },
  Region: {
    name: (region: { name?: string | null; key: string }) => region.name || region.key
  },
  // The three implementations share one field map; each type's own resolver
  // file spreads it so an extension can still override a field per type.
  CartAddress: addressFieldResolvers,
  CustomerAddress: addressFieldResolvers,
  OrderAddress: addressFieldResolvers
};
