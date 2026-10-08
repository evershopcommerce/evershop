import { getActiveLocale } from '../../../../../lib/locale/localeContext.js';
import { getStoreCurrency } from '../../../../setting/services/setting.js';

export default {
  Price: {
    value: (rawPrice) => parseFloat(rawPrice), // TODO: Format for decimal value?
    currency: (_, { currency }) => currency || getStoreCurrency(),
    text: (rawPrice, { currency }) => {
      const price = parseFloat(rawPrice); // TODO: Format for decimal value?
      const curr = currency || getStoreCurrency();
      // The REQUEST locale (URL prefix / X-Locale / adminLanguage), falling back to the
      // `storeLanguage` admin setting. Was `getConfig('shop.language')`, which ignored both
      // the language the shopper is browsing in and the language the admin picked.
      const language = getActiveLocale();
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency: curr
      }).format(price);
    }
  }
};
