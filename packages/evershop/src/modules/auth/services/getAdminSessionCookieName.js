import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export const getAdminSessionCookieName = () =>
  getConfig('system.session.adminCookieName', 'asid');
