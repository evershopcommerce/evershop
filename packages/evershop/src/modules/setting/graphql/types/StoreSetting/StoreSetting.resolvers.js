import {
  getAdditionalLanguages,
  getAdminLanguage,
  getStoreCurrency,
  getStoreLanguage,
  getStoreTimezone
} from '../../../services/setting.js';

export default {
  Setting: {
    storeName: (setting) => {
      const storeName = setting.find((s) => s.name === 'storeName');
      if (storeName) {
        return storeName.value;
      } else {
        return 'An Amazing EverShop Store';
      }
    },
    storeDescription: (setting) => {
      const storeDescription = setting.find(
        (s) => s.name === 'storeDescription'
      );
      if (storeDescription) {
        return storeDescription.value;
      } else {
        return 'An Amazing EverShop Store';
      }
    },
    // Language fields delegate to the setting service helpers (single source of truth,
    // DB-backed with config fallback + is_json parsing) rather than reading the raw
    // `setting` rows — storeLanguages is persisted as a JSON string (spec §6.1 D11).
    storeLanguage: () => getStoreLanguage(),
    // The form's "Additional languages" field — the enabled set minus the default. The
    // full enabled set is always default + these (getEnabledLanguages, server-side).
    storeLanguages: () => getAdditionalLanguages(),
    adminLanguage: () => getAdminLanguage(),
    storeCurrency: () => getStoreCurrency(),
    storeTimeZone: () => getStoreTimezone(),
    storePhoneNumber: (setting) => {
      const storePhoneNumber = setting.find(
        (s) => s.name === 'storePhoneNumber'
      );
      if (storePhoneNumber) {
        return storePhoneNumber.value;
      } else {
        return null;
      }
    },
    storeEmail: (setting) => {
      const storeEmail = setting.find((s) => s.name === 'storeEmail');
      if (storeEmail) {
        return storeEmail.value;
      } else {
        return null;
      }
    },
    storeCountry: (setting) => {
      const storeCountry = setting.find((s) => s.name === 'storeCountry');
      if (storeCountry) {
        return storeCountry.value;
      } else {
        return 'US';
      }
    },
    storeAddress: (setting) => {
      const storeAddress = setting.find((s) => s.name === 'storeAddress');
      if (storeAddress) {
        return storeAddress.value;
      } else {
        return null;
      }
    },
    storeCity: (setting) => {
      const storeCity = setting.find((s) => s.name === 'storeCity');
      if (storeCity) {
        return storeCity.value;
      } else {
        return null;
      }
    },
    storeProvince: (setting) => {
      const storeProvince = setting.find((s) => s.name === 'storeProvince');
      if (storeProvince) {
        return storeProvince.value;
      } else {
        return null;
      }
    },
    storePostalCode: (setting) => {
      const storePostalCode = setting.find((s) => s.name === 'storePostalCode');
      if (storePostalCode) {
        return storePostalCode.value;
      } else {
        return null;
      }
    }
  }
};
