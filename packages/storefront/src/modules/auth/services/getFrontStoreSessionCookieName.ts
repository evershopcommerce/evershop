import { getConfig } from '../../../lib/util/getConfig.js';

export const getFrontStoreSessionCookieName = (): string =>
  getConfig('system.session.cookieName', 'sid');
