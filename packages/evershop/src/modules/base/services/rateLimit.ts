import type { NextFunction, Request, Response } from 'express';
import {
  rateLimit,
  type Options,
  type RateLimitRequestHandler
} from 'express-rate-limit';
import { TOO_MANY_REQUESTS } from '../../../lib/util/httpStatus.js';

/**
 * Per-client-IP rate limits. Hardcoded on purpose (not operator-configurable):
 * they are a capacity safety net, tuned to shed single-source floods while
 * staying generous for real users — including many sharing one NAT/corporate
 * IP. Values are per IP, per window. Note a per-IP limit only stops
 * single-source floods; a distributed flood needs an edge WAF.
 */
const RULES = {
  // Storefront + admin pages: ~5 req/s/IP.
  page: { windowMs: 60_000, limit: 300 },
  // /api/**: scripted clients, tighter than human browsing.
  api: { windowMs: 60_000, limit: 120 },
  // Login / registration / password reset: brute-force / credential-stuffing guard.
  auth: { windowMs: 15 * 60_000, limit: 8 }
} as const;

type Tier = keyof typeof RULES;

/**
 * Requests that must never count against a limit: static assets (served and
 * terminated by publicStatic/themePublicStatic or the dev bundles), HMR, and
 * health probes. Static/asset requests carry a file extension; dynamic pages
 * and REST paths do not — so an extension test cleanly separates the two.
 */
const STATIC_ASSET =
  /\.(?:js|mjs|cjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|txt|xml|json)$/i;

function isExempt(path: string): boolean {
  return (
    STATIC_ASSET.test(path) ||
    path.startsWith('/__webpack_hmr') ||
    path.includes('.hot-update') ||
    path.startsWith('/backend/') || // admin dev bundle
    path === '/health' ||
    path === '/healthz'
  );
}

/** Sensitive credential endpoints (POST) that get the strict `auth` tier. */
const AUTH_POST_PATHS = new Set<string>([
  '/customer/login', // storefront login (customerLoginJson)
  '/admin/user/login', // admin login (adminLoginJson)
  '/api/customers', // customer registration (createCustomer)
  '/api/customers/reset-password', // resetPassword
  '/api/customers/password' // updatePassword
]);

function isApiPath(path: string): boolean {
  return path === '/api' || path.startsWith('/api/');
}

/**
 * A storefront path can carry a leading locale prefix (e.g. `/fr`, `/en-US`)
 * that the locale middleware strips later — but this limiter runs before that,
 * so strip an optional prefix before matching the sensitive endpoints. Only a
 * 2-letter segment (optionally `-CC`) directly followed by `/` is treated as a
 * locale, so real first segments like `/api` or `/account` are left intact.
 */
const LOCALE_PREFIX = /^\/[a-z]{2}(?:-[a-zA-Z]{2})?(?=\/)/;

function withoutLocale(path: string): string {
  return path.replace(LOCALE_PREFIX, '');
}

/**
 * Decide which limit tier a request falls under. This runs before route
 * matching, so it classifies on method + path only. Pure — unit-tested in
 * isolation.
 */
export function classifyRequest(
  method: string,
  path: string
): Tier | 'exempt' {
  if (isExempt(path)) {
    return 'exempt';
  }
  if (
    method === 'POST' &&
    (AUTH_POST_PATHS.has(path) || AUTH_POST_PATHS.has(withoutLocale(path)))
  ) {
    return 'auth';
  }
  if (isApiPath(path)) {
    return 'api';
  }
  return 'page';
}

/**
 * Shared 429 responder: a JSON envelope for API routes (matching EverShop's
 * error shape), plain text for pages. Sets Retry-After from the tier window.
 */
function tooManyRequests(
  request: Request,
  response: Response,
  _next: NextFunction,
  options: Options
): void {
  response.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
  if (isApiPath(request.path)) {
    response.status(TOO_MANY_REQUESTS).json({
      error: {
        status: TOO_MANY_REQUESTS,
        message: 'Too many requests. Please slow down and try again later.'
      }
    });
  } else {
    response
      .status(TOO_MANY_REQUESTS)
      .send('Too many requests. Please slow down and try again shortly.');
  }
}

function build(rule: {
  windowMs: number;
  limit: number;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: rule.windowMs,
    limit: rule.limit,
    standardHeaders: true, // RateLimit-* headers so clients can back off
    legacyHeaders: false,
    handler: tooManyRequests
    // Express `trust proxy` is set to a numeric hop count from TRUST_PROXY_HOPS
    // (see lib/util/getTrustProxyHops.ts), so `request.ip` is the real client IP
    // and express-rate-limit's own trust-proxy validation stays on as an operator
    // guardrail — a numeric value never trips its permissive-trust-proxy check.
  });
}

// Built once at module load (i.e. app initialization) — express-rate-limit
// warns if an instance is created inside a request handler. MemoryStore unrefs
// its cleanup timer, so this does not keep the process alive.
const limiters: Record<Tier, RateLimitRequestHandler> = {
  page: build(RULES.page),
  api: build(RULES.api),
  auth: build(RULES.auth)
};

/**
 * Site-wide rate limiter. Mounted early (before session/locale/DB work) so
 * abusive floods are shed with a 429 before they consume a database connection.
 * Dispatches each request to the matching tier's limiter.
 */
export function rateLimiter(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const tier = classifyRequest(request.method, request.path);
  if (tier === 'exempt') {
    next();
    return;
  }
  limiters[tier](request, response, next);
}
