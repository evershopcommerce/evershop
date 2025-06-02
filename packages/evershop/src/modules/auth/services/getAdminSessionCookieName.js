import { getConfig } from '../../../lib/util/getConfig.js';

export const getAdminSessionCookieName = () =>
  getConfig('system.session.adminCookieName', 'asid');
