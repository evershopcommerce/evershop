import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';
import { translate } from '@evershop/evershop/src/lib/locale/translate/translate.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import { getCurrentCart } from '../../../services/getCurrentCart.js';

export default async (request, response, delegate, next) => {
  const cart = await getCurrentCart(request.sessionID);
  if (!cart) {
    response.redirect(302, buildUrl('cart'));
    return;
  }
  const items = cart.getItems();

  if (items.length === 0 || cart.hasItemError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    setContextValue(request, 'pageInfo', {
      title: translate('Checkout'),
      description: translate('Checkout')
    });
    setContextValue(request, 'cart_id', cart.getData('uuid'));
    next();
  }
};
