import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getStoreCurrency } from '../../../../setting/services/setting.js';

export default {
  Price: {
    value: (rawPrice) => parseFloat(rawPrice), // TODO: Format for decimal value?
    currency: (_, { currency }) => currency || getStoreCurrency(),
    text: (rawPrice, { currency }) => {
      const price = parseFloat(rawPrice); // TODO: Format for decimal value?
      const curr = currency || getStoreCurrency();
      const language = getConfig('shop.language', 'en');
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency: curr
      }).format(price);
    }
  }
};
