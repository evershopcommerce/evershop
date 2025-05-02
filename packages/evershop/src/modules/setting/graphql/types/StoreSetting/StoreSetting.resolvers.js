import { getConfig } from '../../../../../lib/util/getConfig.js';

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
    storeLanguage: () => getConfig('shop.language', 'en'),
    storeCurrency: () => getConfig('shop.currency', 'USD'),
    storeTimeZone: (setting) => {
      const storeTimeZone = setting.find((s) => s.name === 'storeTimeZone');
      if (storeTimeZone) {
        return storeTimeZone.value;
      } else {
        return 'America/New_York';
      }
    },
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
