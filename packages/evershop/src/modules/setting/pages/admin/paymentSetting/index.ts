import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Payment Setting',
    description: 'Payment Setting'
  });
};
