import { getSetting } from '../../../../setting/services/setting.js';
import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';

export default async (request, response, next) => {
  setPageMetaInfo(request, {
    title: await getSetting('storeName', 'EverShop'),
    description: await getSetting(
      'storeDescription',
      'An e-commerce platform with Node and Postgres'
    )
  });
  next();
};
