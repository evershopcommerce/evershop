import { NextFunction } from 'express';
import { StorefrontRequest } from './request.js';
import { StorefrontResponse } from './response.js';

export type SyncMiddlewareFunction<T, D> = (
  req: StorefrontRequest,
  res: StorefrontResponse,
  next?: NextFunction
) => T;

export type AsyncMiddlewareFunction<T, D> = (
  req: StorefrontRequest,
  res: StorefrontResponse,
  next?: NextFunction
) => Promise<T>;

export type ErrorMiddlewareFunction = (
  err: Error,
  req: StorefrontRequest,
  res: StorefrontResponse,
  next?: NextFunction
) => void;

export interface SyncMiddleware<T, D> extends Middleware {
  callback: SyncMiddlewareFunction<T, D>;
}

export interface AsyncMiddleware<T, D> extends Middleware {
  callback: AsyncMiddlewareFunction<T, D>;
}

// --------------------------------------------------------------------------

export type ENext = (error?: Error, ...args: any[]) => void;

export type MiddlewareFunction = (
  request: StorefrontRequest,
  response: StorefrontResponse,
  next: ENext
) => void;

export type MiddlewareFunctionWrapper = (
  request: StorefrontRequest,
  response: StorefrontResponse,
  next: ENext
) => void;

export type ErrorMiddlewareFunctionWrapper = (
  error: Error,
  request: StorefrontRequest,
  response: StorefrontResponse,
  next: ENext
) => void;

export interface Middleware {
  routeId: string;
  id: string;
  path: string;
  scope: 'app' | 'route';
  region: 'pages' | 'api';
  before?: string[];
  after?: string[];
  middleware: MiddlewareFunctionWrapper | ErrorMiddlewareFunctionWrapper;
}
