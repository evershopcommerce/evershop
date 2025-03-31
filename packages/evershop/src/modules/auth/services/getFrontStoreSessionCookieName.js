import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export const getFrontStoreSessionCookieName = () =>
  getConfig('system.session.cookieName', 'sid');
