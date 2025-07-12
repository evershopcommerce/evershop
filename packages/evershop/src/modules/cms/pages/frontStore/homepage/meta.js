import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getSetting } from '../../../../setting/services/setting.js';

export default async (request, response, next) => {
  setContextValue(request, 'pageInfo', {
    title: await getSetting('storeName', 'EverShop'),
    description: await getSetting(
      'storeDescription',
      'An e-commerce platform with Node and Postgres'
    ),
    url: buildUrl('homepage')
  });
  next();
};
