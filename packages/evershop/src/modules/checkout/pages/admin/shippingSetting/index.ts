import { setPageMetaInfo } from 'src/modules/cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Shipping Setting',
    description: 'Shipping Setting'
  });
};
