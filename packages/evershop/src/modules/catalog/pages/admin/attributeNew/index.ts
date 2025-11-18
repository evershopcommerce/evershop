import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Create a new attribute',
    description: 'Create a new attribute'
  });
};
