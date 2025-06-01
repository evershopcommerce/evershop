import { Application } from 'express';
import { get } from '../../../lib/util/get.js';
import { EvershopRequest } from '../../../types/request.js';

export function getContextValue<T>(
  request: EvershopRequest,
  key: string,
  defaultValue: T,
  toString: boolean = false
): T {
  // We check if the request have it, if not we try to get it from the app
  // So if you set a context which already available in app, the old one will be overwited
  const value = get(
    request,
    `locals.context.${key}`,
    get(request.app.locals, `context.${key}`, defaultValue)
  );
  return toString ? value.toString() : value;
}
/**
 * Pass the app instance if you want to set a application level value
 * (This value will be shared across all request)
 * Pass the request instance if you want to set a request level value
 */
export function setContextValue<T>(
  requestOrApp: EvershopRequest | Application,
  key: string,
  value: T
): void {
  requestOrApp.locals = requestOrApp.locals || {};
  requestOrApp.locals.context = requestOrApp.locals.context || {};
  requestOrApp.locals.context[key] = value; // We just overwrite the value if it already exists
}

export function getContext(request: EvershopRequest): Record<string, any> {
  if (!request.app) {
    throw new Error('A request object must be provided');
  }
  const requestLevelContext = get(request, 'locals.context', {});
  const appLevelContext = get(request.app.locals, 'context', {});
  return { ...appLevelContext, ...requestLevelContext };
}

export function hasContextValue(
  request: EvershopRequest,
  key: string
): boolean {
  const requestLevelContext = get(request, 'locals.context', {});
  const appLevelContext = get(request.app.locals, 'context', {});

  return key in requestLevelContext || key in appLevelContext;
}
