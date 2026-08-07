import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Query: {
    themeConfig: () => getConfig('themeConfig')
  }
};
