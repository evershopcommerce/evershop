import { translate } from '../../../../../lib/locale/translate/translate.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { EvershopRequest } from '../../../../../types/request.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { getMyCart } from '../../../services/getMyCart.js';

declare module 'express-session' {
  interface SessionData {
    checkout: {
      id?: string;
      cartId?: string;
      lastOrderId?: string;
    };
  }
}

export default async (request: EvershopRequest, response, next) => {
  const customer = request.getCurrentCustomer();
  const cart = await getMyCart(request.sessionID || '', customer?.customer_id);
  if (!cart) {
    response.redirect(302, buildUrl('cart'));
    return;
  }
  const items = cart.getItems();

  if (items.length === 0 || cart.hasItemError()) {
    response.redirect(302, buildUrl('cart'));
  } else {
    setPageMetaInfo(request, {
      title: translate('Checkout'),
      description: translate('Checkout')
    });
    next();
  }
};
