import { getConfig } from '../../../lib/util/getConfig.js';

export const getCookieSecret = (): string =>
  getConfig('system.session.cookieSecret', 'keyboard cat');
