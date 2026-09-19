import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Shipping Providers',
    description: 'Manage shipping providers'
  });
};
