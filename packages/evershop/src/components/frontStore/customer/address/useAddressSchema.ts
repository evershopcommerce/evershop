import type {
  AddressSurface,
  ResolvedAddressSchema
} from '@evershop/evershop/lib/address/types';
import { useQuery } from 'urql';

/**
 * The address form for a country (spec § 3.9): `addressSchema(country, locale,
 * surface)`. `country` null → the store's default-country setting, and
 * `schema.country` tells the caller what it got (D-20). urql caches per
 * `(query, variables)`, so every component asking for the same country shares
 * one request. The request locale travels in the `X-Locale` header the
 * storefront adds to every same-origin fetch; `locale` is only for an explicit
 * override.
 */
export const AddressSchemaQuery = `
  query AddressSchema($country: String, $locale: String, $surface: String) {
    addressSchema(country: $country, locale: $locale, surface: $surface) {
      country
      locale
      script
      format
      nameOrder
      upper
      fields {
        id
        token
        type
        labelType
        label
        required
        pattern {
          regex
          messageKey
        }
        placeholder
        optionSource
        dependsOn
        row
      }
    }
  }
`;

export function useAddressSchema(
  country: string | null | undefined,
  surface: AddressSurface,
  locale?: string | null
): {
  schema: ResolvedAddressSchema | undefined;
  fetching: boolean;
  error: Error | undefined;
} {
  const [result] = useQuery({
    query: AddressSchemaQuery,
    variables: {
      country: country ? country.toUpperCase() : null,
      locale: locale ?? null,
      surface
    }
  });
  return {
    schema: result.data?.addressSchema as ResolvedAddressSchema | undefined,
    fetching: result.fetching,
    error: result.error
  };
}
