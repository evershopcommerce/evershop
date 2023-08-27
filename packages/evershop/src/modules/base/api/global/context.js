const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const {
  setContextValue,
  hasContextValue
} = require('../../../graphql/services/contextHelper');

module.exports = (request, response) => {
  response.context = {};
  /** Some default context value */
  if (!hasContextValue(request, 'pool')) {
    setContextValue(request.app, 'pool', pool);
  }
  setContextValue(
    request.app,
    'homeUrl',
    `${request.protocol}://${request.get('host')}`
  );
  setContextValue(
    request,
    'currentUrl',
    `${request.protocol}://${request.get('host')}${request.originalUrl}`
  );
  setContextValue(request, 'baseUrl', request.baseUrl);
  setContextValue(request, 'body', request.body);
  setContextValue(request, 'cookies', request.cookies);
  setContextValue(request, 'fresh', request.fresh);
  setContextValue(request.app, 'hostname', request.hostname);
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
