import type { Region } from '@evershop/evershop/lib/address/types';
import { useQuery } from 'urql';

/**
 * Active regions below `parentPath` for a country (spec § 3.3, § 3.9), fetched
 * lazily: paused until the country and every parent key are known. Retired
 * keys never come back, so a stored retired value shows the invalid marker in
 * the select. Cached by urql per `(country, parentPath)`.
 */
export const RegionsQuery = `
  query AddressRegions($country: String!, $parentPath: [String!]) {
    regions(country: $country, parentPath: $parentPath) {
      key
      name
      isoCode
    }
  }
`;

export function useRegions(
  country: string | null | undefined,
  parentPath: string[],
  pause = false
): { regions: Region[]; fetching: boolean; error: Error | undefined } {
  const ready = Boolean(country) && parentPath.every((key) => key !== '');
  const [result] = useQuery({
    query: RegionsQuery,
    variables: { country: country ? country.toUpperCase() : '', parentPath },
    pause: pause || !ready
  });
  return {
    regions: ready ? ((result.data?.regions as Region[] | undefined) ?? []) : [],
    fetching: ready && result.fetching,
    error: result.error
  };
}
