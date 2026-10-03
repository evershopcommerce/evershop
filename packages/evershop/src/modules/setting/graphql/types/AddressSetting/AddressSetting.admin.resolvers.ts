import { getAddressSettings } from '../../../../base/services/address/getAddressSettings.js';

/**
 * The admin Addresses page reads these; they are the same normalized values
 * `resolveStoreAddressSchema` uses, so the page always shows what the store
 * actually applies (an unknown stored value shows as its default).
 */
export default {
  Setting: {
    addressNameFormat: () => getAddressSettings().nameFormat,
    addressTelephone: () => getAddressSettings().telephone,
    addressOrganization: () => getAddressSettings().organization,
    addressLine2: () => getAddressSettings().addressLine2,
    addressLine3: () => getAddressSettings().addressLine3,
    addressRequired: () => getAddressSettings().required,
    addressDefaultCountry: () => getAddressSettings().defaultCountry,
    addressSellToCountries: () => getAddressSettings().sellToCountries
  }
};
