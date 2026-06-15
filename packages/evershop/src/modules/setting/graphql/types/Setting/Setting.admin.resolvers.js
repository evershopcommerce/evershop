import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { getShopMetaData } from '../../../../base/services/shopMetafield.js';

export default {
  Setting: {
    metaData: () => getShopMetaData(),
    shopMetafieldsApi: () => buildUrl('updateShopMetafields', {})
  }
};
