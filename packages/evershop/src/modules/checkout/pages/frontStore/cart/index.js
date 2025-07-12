import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';

export default (request, response) => {
  setContextValue(request, 'pageInfo', {
    title: translate('Shopping cart'),
    description: translate('Shopping cart')
  });
};
