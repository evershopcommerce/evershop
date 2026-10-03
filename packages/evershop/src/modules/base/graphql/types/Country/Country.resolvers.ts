import { getCountryName } from '../../../../../lib/address/countries.js';
import { getActiveLocale } from '../../../../../lib/locale/localeContext.js';
import {
  getCountriesForScope,
  type CountryScope
} from '../../../services/address/countryScopes.js';

type CountryParent = string | { code?: string | null; name?: string | null };

function codeOf(country: CountryParent): string {
  return typeof country === 'string' ? country : country?.code ?? '';
}

export default {
  Query: {
    countries: (_: unknown, { scope }: { scope?: CountryScope | null }) =>
      getCountriesForScope(scope ?? 'ALL', getActiveLocale())
  },
  Country: {
    // A parent may be a full `{ code, name }`, a `{ code }` from an address
    // resolver, or a bare code string (legacy callers). Unknown codes resolve
    // to the code itself rather than throwing (D5).
    name: (country: CountryParent) =>
      (typeof country === 'object' && country?.name) ||
      getCountryName(codeOf(country), getActiveLocale()),
    code: (country: CountryParent) => codeOf(country)
  }
};
