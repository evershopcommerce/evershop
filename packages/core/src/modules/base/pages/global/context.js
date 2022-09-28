const { setContextValue } = require("../../../graphql/services/buildContext");

module.exports = (request, response) => {
  request.locals = request.locals || {};
  request.locals.context = {};
  response.context = {};
  /** Some default context value */
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
