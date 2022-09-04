const { setContextValue } = require("../../../../lib/util/getContextValue");

module.exports = (request, response) => {
  response.context = {};
  /** Some default context value */
  response.context.homeUrl = `${request.protocol}://${request.get('host')}`;
  response.context.currentUrl = `${request.protocol}://${request.get('host')}${request.originalUrl}`;

  setContextValue('homeUrl', `${request.protocol}://${request.get('host')}`);
  setContextValue('currentUrl', `${request.protocol}://${request.get('host')}${request.originalUrl}`);
  setContextValue('baseUrl', request.baseUrl)
  setContextValue('body', request.body)
  setContextValue('cookies', request.cookies)
  setContextValue('fresh', request.fresh)
  setContextValue('hostname', request.hostname)
  setContextValue('ip', request.ip)
  setContextValue('ips', request.ips)
  setContextValue('method', request.method)
  setContextValue('originalUrl', request.originalUrl)
  setContextValue('params', request.params)
  setContextValue('path', request.path)
  setContextValue('protocol', request.protocol)
  setContextValue('query', request.query)
  setContextValue('route', request.route)
  setContextValue('secure', request.secure)
  setContextValue('signedCookies', request.signedCookies)
  setContextValue('stale', request.stale)
  setContextValue('subdomains', request.subdomains)
  setContextValue('xhr', request.xhr)
};
