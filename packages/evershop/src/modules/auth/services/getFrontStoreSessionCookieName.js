import { getConfig } from '../../../lib/util/getConfig.js';

export const getFrontStoreSessionCookieName = () =>
  getConfig('system.session.cookieName', 'sid');
