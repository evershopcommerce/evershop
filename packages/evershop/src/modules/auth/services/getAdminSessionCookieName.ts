import { getConfig } from '../../../lib/util/getConfig.js';

export const getAdminSessionCookieName = (): string =>
  getConfig('system.session.adminCookieName', 'asid');
