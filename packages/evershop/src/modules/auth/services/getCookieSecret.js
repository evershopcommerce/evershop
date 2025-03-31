import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export const getCookieSecret = () =>
  getConfig('system.session.cookieSecret', 'keyboard cat');
