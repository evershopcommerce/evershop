import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export default {
  Query: {
    themeConfig: () => getConfig('themeConfig')
  }
};
