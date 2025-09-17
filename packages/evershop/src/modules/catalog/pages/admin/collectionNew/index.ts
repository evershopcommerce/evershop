import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Create a new collection',
    description: 'Create a new collection'
  });
};
