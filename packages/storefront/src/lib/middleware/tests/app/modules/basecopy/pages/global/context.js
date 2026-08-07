import { setContextValue } from '../../../../../../../../modules/graphql/services/contextHelper.js';

export default (request, response) => {
  response.context = {}; // TODO: Fix this

  setContextValue(
    request,
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
};
