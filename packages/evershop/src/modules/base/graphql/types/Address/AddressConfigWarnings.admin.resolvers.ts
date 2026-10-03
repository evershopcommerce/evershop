import { getActiveLocale } from '../../../../../lib/locale/localeContext.js';
import { getAddressConfigWarnings } from '../../../services/address/addressConfigWarnings.js';

export default {
  Query: {
    addressConfigWarnings: async () => {
      const warnings = await getAddressConfigWarnings(getActiveLocale());
      return warnings.map((warning) => ({
        ...warning,
        kind: warning.kind.toUpperCase()
      }));
    }
  }
};
