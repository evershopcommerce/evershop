import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Create a new cms page',
    description: 'Create a new cms page'
  });
};
