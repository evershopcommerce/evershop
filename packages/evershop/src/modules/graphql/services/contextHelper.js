/* eslint-disable no-param-reassign */
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports.getContextValue = function getContextValue(
  request,
  key,
  defaultValue = undefined,
  toString = false
) {
  // We check if the request have it, if not we try to get it from the app
  // So if you set a context which already available in app, the old one will be overwited
  const value = get(
    request,
    `locals.context.${key}`,
    get(request.app.locals, `context.${key}`, defaultValue)
  );
  return toString ? value.toString() : value;
};
/**
 * Pass the app instance if you want to set a application level value
 * (This value will be shared across all request)
 * Pass the request instance if you want to set a request level value
 */
module.exports.setContextValue = function setContextValue(
  requestOrApp,
  key,
  value
) {
  requestOrApp.locals = requestOrApp.locals || {};
  requestOrApp.locals.context = requestOrApp.locals.context || {};
  requestOrApp.locals.context[key] = value; // We just overwrite the value if it already exists
};

module.exports.getContext = function getContext(request) {
  if (!request.app) {
    throw new Error('A request object must be provided');
  }
  const requestLevelContext = get(request, 'locals.context', {});
  const appLevelContext = get(request.app.locals, 'context', {});
  return { ...appLevelContext, ...requestLevelContext };
};

module.exports.hasContextValue = function hasContextValue(request, key) {
  const requestLevelContext = get(request, 'locals.context', {});
  const appLevelContext = get(request.app.locals, 'context', {});

  return key in requestLevelContext || key in appLevelContext;
};
