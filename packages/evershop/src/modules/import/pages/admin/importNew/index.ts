import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'New import',
    description:
      'Import products, categories, customers or customer addresses from a CSV file'
  });
};
