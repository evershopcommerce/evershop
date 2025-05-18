import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  hasContextValue,
  setContextValue
} from '../../../graphql/services/contextHelper.js';

export default (request, response) => {
  response.context = {}; // TODO: Fix this
  /** Some default context value */
  if (!hasContextValue(request, 'pool')) {
    setContextValue(request.app, 'pool', pool);
  }
  setContextValue(request, 'pool', pool);
  const homeUrl = getConfig(
    'shop.homeUrl',
    `${request.protocol}://${request.get('host')}`
  );
  setContextValue(request.app, 'homeUrl', homeUrl);
  setContextValue(request, 'currentUrl', `${homeUrl}${request.originalUrl}`);
  setContextValue(request, 'baseUrl', request.baseUrl);
  setContextValue(request, 'body', request.body);
  setContextValue(request, 'cookies', request.cookies);
  setContextValue(request, 'fresh', request.fresh);
  setContextValue(request, 'hostname', request.hostname);
  setContextValue(request, 'ip', request.ip);
  setContextValue(request, 'ips', request.ips);
  setContextValue(request, 'method', request.method);
  setContextValue(request, 'originalUrl', request.originalUrl);
  setContextValue(request, 'params', request.params);
  setContextValue(request, 'path', request.path);
  setContextValue(request, 'protocol', request.protocol);
  setContextValue(request, 'query', request.query);
  setContextValue(request, 'route', request.route);
  setContextValue(request, 'secure', request.secure);
  setContextValue(request, 'signedCookies', request.signedCookies);
  setContextValue(request, 'stale', request.stale);
  setContextValue(request, 'subdomains', request.subdomains);
  setContextValue(request, 'xhr', request.xhr);
  setContextValue(request, 'sid', request.sessionID);
};
