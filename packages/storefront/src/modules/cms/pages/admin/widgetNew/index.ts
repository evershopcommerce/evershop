import { setPageMetaInfo } from '../../../services/pageMetaInfo.js';

export default (request, response) => {
  setPageMetaInfo(request, {
    title: 'Create a new widget',
    description: 'Create a new widget'
  });
};
